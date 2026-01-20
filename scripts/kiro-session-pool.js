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

const POOL_SIZE = 2;
const SESSION_TIMEOUT = 180000; // 180 seconds
const IDLE_DETECTION_TIME = 2000; // 2 seconds of no output = complete
const RECOVERY_TIMEOUT = 5000; // 5 seconds to recover after Ctrl+C
const LOG_FILE = '/tmp/kiro-cli-live.log';

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

class KiroSession {
  constructor(id, logStream) {
    this.id = id;
    this.logStream = logStream;
    this.process = null;
    this.busy = false;
    this.stuck = false;
    this.lastUsed = Date.now();
    this.lastOutputTime = null;
    this.currentPrompt = null;
    this.currentResolve = null;
    this.currentReject = null;
    this.outputBuffer = '';
    this.timeoutHandle = null;
    this.idleCheckHandle = null;
    
    this.start();
  }
  
  start() {
    this.log(`Starting Kiro CLI session ${this.id}`);
    
    this.process = spawn('kiro-cli', ['chat', '--trust-all-tools'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
  
    this.process.stdout.on('data', (data) => {
      const chunk = data.toString();
      this.outputBuffer += chunk;
      this.lastOutputTime = Date.now();
      this.log(chunk);
      
      // Start idle detection
      this.checkIdleCompletion();
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
    if (message.includes('===') || message.includes('Starting') || message.includes('closed') || message.includes('stuck') || message.includes('Sent Ctrl+C')) {
      const timestamp = new Date().toISOString();
      this.logStream.write(`[Session-${this.id}] [${timestamp}] ${message}`);
    } else {
      // Raw output without prefix
      this.logStream.write(message);
    }
  }
  
  async execute(prompt) {
    if (this.busy) {
      throw new Error(`Session ${this.id} is busy`);
    }
    
    this.busy = true;
    this.stuck = false;
    this.lastUsed = Date.now();
    this.currentPrompt = prompt;
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
  
  checkIdleCompletion() {
    // Clear previous idle check
    if (this.idleCheckHandle) {
      clearTimeout(this.idleCheckHandle);
    }
    
    // Only check if busy
    if (!this.busy) {
      return;
    }
    
    // Set new idle check
    this.idleCheckHandle = setTimeout(() => {
      const timeSinceLastOutput = Date.now() - this.lastOutputTime;
      
      // If no output for IDLE_DETECTION_TIME and we have some output, consider complete
      if (timeSinceLastOutput >= IDLE_DETECTION_TIME && this.outputBuffer.length > 0) {
        this.log(`Idle detection: completing after ${timeSinceLastOutput}ms of no output`);
        
        // If we have a resolver (execute mode), resolve it
        if (this.currentResolve) {
          this.complete();
        } else {
          // Fire-and-forget mode (send), just cleanup
          this.cleanup();
        }
      }
    }, IDLE_DETECTION_TIME);
  }
  
  complete() {
    if (!this.currentResolve) {
      return;
    }
    
    const resolve = this.currentResolve;
    const output = this.outputBuffer;
    
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
    this.log(`⚠️  Session ${this.id} appears stuck, attempting graceful recovery`);
    
    // Try Ctrl+C first
    try {
      this.process.stdin.write('\x03'); // Ctrl+C
      this.log(`Sent Ctrl+C to session ${this.id}`);
      
      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, RECOVERY_TIMEOUT));
      
      // Check if recovered
      if (!this.busy) {
        this.log(`✅ Session ${this.id} recovered`);
        this.stuck = false;
        return;
      }
      
      // Still stuck, kill and restart
      this.log(`❌ Session ${this.id} did not recover, killing process`);
      this.forceRestart();
      
    } catch (err) {
      this.log(`Error during recovery: ${err.message}`);
      this.forceRestart();
    }
  }
  
  forceRestart() {
    const reject = this.currentReject;
    
    if (this.process) {
      this.process.kill('SIGKILL');
      this.process = null;
    }
    
    this.cleanup();
    
    if (reject) {
      reject(new Error('Session stuck and restarted'));
    }
    
    setTimeout(() => this.start(), 1000);
  }
  
  cleanup() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    
    if (this.idleCheckHandle) {
      clearTimeout(this.idleCheckHandle);
      this.idleCheckHandle = null;
    }
    
    this.busy = false;
    this.stuck = false;
    this.currentPrompt = null;
    this.currentResolve = null;
    this.currentReject = null;
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
  
  async execute(prompt) {
    // Find available session
    const session = this.sessions.find(s => !s.busy && !s.stuck);
    
    if (session) {
      // Execute immediately
      return await session.execute(prompt);
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
      const result = await session.execute(item.prompt);
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    }
    
    // Process next item in queue
    setTimeout(() => this.processQueue(), 100);
  }
  
  getStatus() {
    return {
      poolSize: this.sessions.length,
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
        
        // Set timeout for stuck detection
        session.timeoutHandle = setTimeout(() => {
          if (session.busy) {
            session.log(`⚠️  Session ${session.id} timeout in fire-and-forget mode`);
            session.cleanup();
          }
        }, SESSION_TIMEOUT);
        
        session.log(`\n=== COMMAND ===\n${prompt}\n=== END ===\n`);
        session.process.stdin.write(prompt + '\n');
        
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
        const { prompt } = JSON.parse(body);
        
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Prompt is required' }));
          return;
        }
        
        const result = await pool.execute(prompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        
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
