#!/usr/bin/env node

/**
 * Kiro CLI Session Pool Server
 * Manages multiple Kiro CLI sessions for concurrent request handling
 * 
 * Core Features:
 * 1. Persistent sessions (no kill after each request)
 * 2. Request queue when all sessions busy
 * 3. Graceful stuck recovery (Ctrl+C before kill)
 */

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import http from 'http';

const POOL_SIZE = 4;
const SESSION_TIMEOUT = 180000; // 180 seconds
const RECOVERY_TIMEOUT = 5000; // 5 seconds to recover after Ctrl+C
const LOG_FILE = '/tmp/kiro-cli-live.log';
const PROCESS_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Cleanup existing kiro-cli processes before starting
async function cleanupExistingKiroProcesses() {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    console.log('🧹 Cleaning up existing kiro-cli processes...');
    await execAsync('pkill -f "kiro-cli chat --trust-all-tools"');
    // Wait for processes to terminate
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Cleanup completed');
  } catch (error) {
    // Ignore error if no processes found
    console.log('ℹ️  No existing kiro-cli processes to clean up');
  }
}

// Check for orphaned Kiro processes (more than POOL_SIZE + 2)
async function checkOrphanedProcesses() {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout } = await execAsync('ps aux | grep "kiro-cli chat" | grep -v grep | wc -l');
    const count = parseInt(stdout.trim());
    const maxAllowed = POOL_SIZE + 2; // Allow some buffer
    
    if (count > maxAllowed) {
      console.log(`⚠️  Detected ${count} kiro-cli processes (max: ${maxAllowed}), cleaning up...`);
      await cleanupExistingKiroProcesses();
      return true;
    }
  } catch (error) {
    // Ignore errors
  }
  return false;
}

class KiroSession {
  constructor(id, logStream) {
    this.id = id;
    this.logStream = logStream;
    this.process = null;
    this.busy = false;
    this.stuck = false;
    this.stuckCount = 0;  // Track recovery attempts
    this.maxStuckRetries = 3;  // Max recovery attempts before recreate
    this.lastUsed = Date.now();
    this.lastOutputTime = null;
    this.currentPrompt = null;
    this.outputBuffer = '';
    this.currentResolve = null;
    this.currentReject = null;
    this.timeoutHandle = null;
    this.currentRequestId = null;
    
    this.start();
  }
  
  start() {
    this.log(`Starting Kiro CLI session ${this.id}`);
    
    // Pass environment variables to Kiro CLI
    const env = {
      ...process.env,
      SKIP_GATING_TESTS: process.env.SKIP_GATING_TESTS || 'false'
    };
    
    this.process = spawn('kiro-cli', ['chat', '--trust-all-tools'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env
    });
  
    this.process.stdout.on('data', (data) => {
      const chunk = data.toString();
      this.outputBuffer += chunk;
      this.lastOutputTime = Date.now();
      this.log(chunk);
    });
    
    this.process.stderr.on('data', (data) => {
      // Suppress stderr to avoid log clutter
    });
    
    this.process.on('close', () => {
      this.log(`Session ${this.id} closed, restarting...`);
      if (this.currentReject) {
        this.currentReject(new Error('Kiro CLI process closed'));
      }
      this.cleanup();
      setTimeout(() => this.start(), 1000);
    });
  }
  
  log(message) {
    // Only log session ID prefix for commands, not for output chunks
    if (message.includes('===') || message.includes('Starting') || message.includes('closed') || message.includes('stuck') || message.includes('Sent Ctrl+C') || message.includes('completion signal')) {
      const timestamp = new Date().toISOString();
      this.logStream.write(`[Session-${this.id}] [${timestamp}] ${message}`);
    } else {
      // Raw output without prefix
      this.logStream.write(message);
    }
  }
  
  async execute(prompt, requestId = null) {
    if (this.busy) {
      throw new Error(`Session ${this.id} is busy`);
    }
    
    this.busy = true;
    this.stuck = false;
    this.lastUsed = Date.now();
    this.currentPrompt = prompt;
    this.currentRequestId = requestId;
    this.outputBuffer = '';
    this.lastOutputTime = Date.now();
    
    return new Promise((resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;
      
      // Set timeout for stuck detection
      this.timeoutHandle = setTimeout(() => {
        this.handleStuck();
      }, SESSION_TIMEOUT);
      
      // Send prompt
      this.log(`\n=== COMMAND ===\n${prompt}\n=== END ===\n`);
      this.process.stdin.write(prompt + '\n');
    });
  }
  
  complete() {
    if (!this.currentResolve) {
      return;
    }
    
    const resolve = this.currentResolve;
    const output = this.outputBuffer;
    
    // Reset stuck counter on successful completion
    this.stuckCount = 0;
    
    this.cleanup();
    
    resolve({
      output: output,
      sessionId: this.id
    });
  }
  
  async handleStuck() {
    if (!this.busy || this.stuck) {
      return;
    }
    
    this.stuck = true;
    this.stuckCount++;
    
    this.log(`⚠️  Session ${this.id} stuck (attempt ${this.stuckCount}/${this.maxStuckRetries})`);
    
    if (this.stuckCount <= this.maxStuckRetries) {
      // Attempt recovery
      await this.attemptRecovery();
      
      // Wait and check if recovered
      await new Promise(resolve => setTimeout(resolve, RECOVERY_TIMEOUT));
      
      if (!this.busy || !this.isStillStuck()) {
        this.log(`✅ Session ${this.id} recovered after attempt ${this.stuckCount}`);
        this.stuck = false;
        this.stuckCount = 0;  // Reset on success
        return;
      }
      
      // Still stuck, try again
      this.stuck = false;  // Allow next attempt
      await this.handleStuck();
      
    } else {
      // Failed 3 times - complete recreation
      this.log(`❌ Session ${this.id} failed ${this.maxStuckRetries} times, recreating...`);
      this.destroy();
      this.stuckCount = 0;  // Reset counter
      setTimeout(() => this.start(), 1000);
    }
  }
  
  async attemptRecovery() {
    try {
      // Step 1: Ctrl+C (gentle)
      this.process.stdin.write('\x03');
      this.log(`  → Sent Ctrl+C to session ${this.id}`);
      await this.wait(2000);
      
      if (this.isStillStuck()) {
        // Step 2: SIGTERM (graceful shutdown)
        this.process.kill('SIGTERM');
        this.log(`  → Sent SIGTERM to session ${this.id}`);
        await this.wait(2000);
      }
      
      if (this.isStillStuck()) {
        // Step 3: SIGKILL (force)
        this.process.kill('SIGKILL');
        this.log(`  → Sent SIGKILL to session ${this.id}`);
      }
    } catch (err) {
      this.log(`  ⚠️  Recovery error: ${err.message}`);
    }
  }
  
  isStillStuck() {
    return this.busy && this.lastOutputTime && 
           (Date.now() - this.lastOutputTime > 5000);
  }
  
  destroy() {
    const reject = this.currentReject;
    
    if (this.process) {
      try {
        this.process.kill('SIGKILL');
      } catch (err) {
        // Ignore
      }
      this.process = null;
    }
    
    this.cleanup();
    
    if (reject) {
      reject(new Error(`Session failed after ${this.maxStuckRetries} recovery attempts`));
    }
  }
  
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  forceRestart() {
    // Deprecated - use destroy() instead
    this.destroy();
    setTimeout(() => this.start(), 1000);
  }
  
  cleanup() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    
    this.busy = false;
    this.stuck = false;
    this.currentPrompt = null;
    this.currentResolve = null;
    this.currentReject = null;
    this.currentRequestId = null;
    this.outputBuffer = '';
  }
  
  kill() {
    if (this.process) {
      this.process.kill();
    }
  }
}

class KiroSessionPool {
  constructor(size) {
    this.logStream = createWriteStream(LOG_FILE, { flags: 'a' });
    this.sessions = [];
    this.queue = []; // Request queue
    
    // Initialize log
    const timestamp = new Date().toISOString();
    this.logStream.write(`\n\n=== Kiro Session Pool Started: ${timestamp} ===\n`);
    
    // Create sessions
    for (let i = 0; i < size; i++) {
      this.sessions.push(new KiroSession(i, this.logStream));
    }
  }
  
  async execute(prompt, requestId = null) {
    // Find available session
    const session = this.sessions.find(s => !s.busy && !s.stuck);
    
    if (session) {
      // Execute immediately
      return await session.execute(prompt, requestId);
    }
    
    // All sessions busy, add to queue
    this.logStream.write(`[Pool] All sessions busy, queuing request (queue size: ${this.queue.length + 1})\n`);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove from queue
        const index = this.queue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new Error('Queue timeout'));
      }, SESSION_TIMEOUT);
      
      this.queue.push({
        prompt,
        requestId,
        resolve,
        reject,
        timeout,
        addedAt: Date.now()
      });
      
      // Try to process queue
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.queue.length === 0) {
      return;
    }
    
    // Find available session
    const session = this.sessions.find(s => !s.busy && !s.stuck);
    
    if (!session) {
      return; // No available session
    }
    
    // Get next item from queue
    const item = this.queue.shift();
    
    if (!item) {
      return;
    }
    
    clearTimeout(item.timeout);
    
    const waitTime = Date.now() - item.addedAt;
    this.logStream.write(`[Pool] Processing queued request (waited ${waitTime}ms, queue size: ${this.queue.length})\n`);
    
    try {
      const result = await session.execute(item.prompt, item.requestId);
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    }
    
    // Process next item in queue
    setTimeout(() => this.processQueue(), 100);
  }
  
  getStatus() {
    const available = this.sessions.filter(s => !s.busy && !s.stuck).length;
    const busy = this.sessions.filter(s => s.busy).length;
    const stuck = this.sessions.filter(s => s.stuck).length;
    
    return {
      poolSize: this.sessions.length,
      available,
      busy,
      stuck,
      queueLength: this.queue.length,
      sessions: this.sessions.map(s => ({
        id: s.id,
        busy: s.busy,
        stuck: s.stuck,
        lastUsed: new Date(s.lastUsed).toISOString(),
        idleTime: Date.now() - s.lastUsed
      }))
    };
  }
}

// Create pool
// Cleanup and initialize pool
await cleanupExistingKiroProcesses();
const pool = new KiroSessionPool(POOL_SIZE);

// Periodic cleanup check (every 5 minutes)
setInterval(async () => {
  const cleaned = await checkOrphanedProcesses();
  if (cleaned) {
    console.log('⚠️  Orphaned processes detected and cleaned, restarting pool...');
    // Pool will auto-restart sessions
  }
}, PROCESS_CLEANUP_INTERVAL);

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health endpoint
  if (url.pathname === '/health' && req.method === 'GET') {
    const status = pool.getStatus();
    const isHealthy = status.available > 0 || status.busy < POOL_SIZE;
    res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: isHealthy ? 'healthy' : 'unhealthy',
      poolSize: POOL_SIZE,
      available: status.available,
      busy: status.busy,
      stuck: status.stuck,
      uptime: Math.floor(process.uptime())
    }));
    return;
  }
  
  // Status endpoint
  if (url.pathname === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(pool.getStatus()));
    return;
  }
  
  // Send endpoint (fire-and-forget, no response wait)
  if (url.pathname === '/send' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { prompt } = JSON.parse(body);
        
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Prompt is required' }));
          return;
        }
        
        // Find available session
        const session = pool.sessions.find(s => !s.busy && !s.stuck);
        
        if (!session) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'All sessions busy' }));
          return;
        }
        
        // Send prompt without waiting for response
        session.busy = true;
        session.lastUsed = Date.now();
        session.currentPrompt = prompt;
        session.outputBuffer = '';
        session.lastOutputTime = Date.now();
        
        session.log(`\n=== COMMAND ===\n${prompt}\n=== END ===\n`);
        session.process.stdin.write(prompt + '\n');
        
        // Fire-and-forget: cleanup immediately after sending
        setTimeout(() => {
          session.cleanup();
        }, 1000); // Give 1 second for command to be written
        
        // Return immediately
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'sent', sessionId: session.id }));
        
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    
    return;
  }
  
  // Execute endpoint
  if (url.pathname === '/execute' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { prompt, requestId } = JSON.parse(body);
        
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Prompt is required' }));
          return;
        }
        
        // Store requestId mapping if provided
        if (requestId) {
          const result = await pool.execute(prompt, requestId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          const result = await pool.execute(prompt);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
        
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    
    return;
  }
  
  // Complete endpoint - called by Semantic API when Kiro sends final response
  if (url.pathname === '/complete' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { requestId } = JSON.parse(body);
        
        if (!requestId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'requestId is required' }));
          return;
        }
        
        // Find session with this requestId
        const session = pool.sessions.find(s => s.currentRequestId === requestId);
        
        if (session && session.busy) {
          pool.logStream.write(`[Pool] Received completion signal for requestId: ${requestId}, session: ${session.id}\n`);
          session.complete();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'completed', sessionId: session.id }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session not found or not busy' }));
        }
        
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    
    return;
  }
  
  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 8082;
server.listen(PORT, () => {
  console.log(`🚀 Kiro Session Pool Server running on port ${PORT}`);
  console.log(`📊 Pool size: ${POOL_SIZE}`);
  console.log(`📝 Log file: ${LOG_FILE}`);
});
