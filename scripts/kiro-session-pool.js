#!/usr/bin/env node

/**
 * Kiro CLI Session Pool Server
 * Manages multiple Kiro CLI sessions for concurrent request handling
 */

import { spawn } from 'child_process';
import { createWriteStream, appendFileSync } from 'fs';
import http from 'http';

const POOL_SIZE = 2;
const SESSION_TIMEOUT = 600000; // 10 minutes
const IDLE_RESTART_TIME = 300000; // 5 minutes
const LOG_FILE = '/tmp/kiro-cli-live.log';

class KiroSession {
  constructor(id, logStream) {
    this.id = id;
    this.logStream = logStream;
    this.process = null;
    this.busy = false;
    this.lastUsed = Date.now();
    this.currentPrompt = null;
    this.currentResolve = null;
    this.currentReject = null;
    this.outputBuffer = '';
    this.timeoutHandle = null;
    
    this.start();
  }
  
  start() {
    // Safety check: count existing kiro-cli processes
    const psProcess = spawn('sh', ['-c', "ps aux | grep 'kiro-cli' | grep -v grep | grep -v 'ps aux' | wc -l"]);
    let countOutput = '';
    
    psProcess.stdout.on('data', (data) => {
      countOutput += data.toString();
    });
    
    psProcess.on('close', () => {
      const processCount = parseInt(countOutput.trim());
      if (processCount > 10) {  // Allow more headroom: 2 sessions * (2 parent + 2 child + 2 tee) = 12 max
        this.log(`⚠️  Too many kiro-cli processes (${processCount}), killing excess processes`);
        
        // Kill all kiro-cli processes and restart
        spawn('pkill', ['-f', 'kiro-cli']);
        
        setTimeout(() => this.start(), 2000);
        return;
      }
      
      this.log(`Starting Kiro CLI session ${this.id}`);
      
      this.process = spawn('kiro-cli', ['chat', '--trust-all-tools'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    
      this.process.stdout.on('data', (data) => {
        const chunk = data.toString();
        this.outputBuffer += chunk;
        this.log(chunk);
        
        // Detect prompt (ready for next command)
        if (chunk.includes('> ') || chunk.includes('I ')) {
          this.checkCompletion();
        }
      });
      
      this.process.stderr.on('data', (data) => {
        // Don't log stderr to avoid cluttering the log with spinner animations
        // this.log(`[ERROR] ${data.toString()}`);
      });
      
      this.process.on('close', () => {
        this.log(`Session ${this.id} closed, restarting...`);
        if (this.currentReject) {
          this.currentReject(new Error('Kiro CLI process closed'));
        }
        setTimeout(() => this.start(), 1000);
      });
    });
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const prefix = `[Session-${this.id}] [${timestamp}] `;
    this.logStream.write(prefix + message);
  }
  
  async execute(prompt) {
    if (this.busy) {
      throw new Error(`Session ${this.id} is busy`);
    }
    
    this.busy = true;
    this.lastUsed = Date.now();
    this.currentPrompt = prompt;
    this.outputBuffer = '';
    
    return new Promise((resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;
      
      // Set timeout
      this.timeoutHandle = setTimeout(() => {
        this.log(`Session ${this.id} timeout after ${SESSION_TIMEOUT}ms`);
        this.cleanup();
        reject(new Error('Session timeout'));
      }, SESSION_TIMEOUT);
      
      // Send prompt
      this.log(`\n=== COMMAND ===\n${prompt}\n=== END ===\n`);
      this.process.stdin.write(prompt + '\n');
    });
  }
  
  checkCompletion() {
    // Only check completion if there's an active request
    if (!this.currentResolve) {
      return;
    }
    
    // Simple completion detection: look for prompt or specific markers
    if (this.outputBuffer.length > 100) {
      const resolve = this.currentResolve;
      const output = this.outputBuffer;
      const sessionId = this.id;
      
      this.cleanup();
      
      resolve({
        output: output,
        sessionId: sessionId
      });
    }
  }
  
  cleanup() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    this.busy = false;
    this.currentPrompt = null;
    this.currentResolve = null;
    this.currentReject = null;
    
    // Kill and restart the process to prevent memory leaks
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    setTimeout(() => this.start(), 1000);
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
    
    // Initialize log
    const timestamp = new Date().toISOString();
    this.logStream.write(`\n\n=== Kiro Session Pool Started: ${timestamp} ===\n`);
    
    // Create sessions
    for (let i = 0; i < size; i++) {
      this.sessions.push(new KiroSession(i, this.logStream));
    }
    
    // Health check interval
    setInterval(() => this.healthCheck(), 60000); // Every minute
  }
  
  async execute(prompt) {
    // Find available session
    const session = this.sessions.find(s => !s.busy);
    
    if (!session) {
      throw new Error('All sessions busy');
    }
    
    return await session.execute(prompt);
  }
  
  healthCheck() {
    const now = Date.now();
    this.sessions.forEach(session => {
      if (!session.busy && now - session.lastUsed > IDLE_RESTART_TIME) {
        session.logStream.write(`[Health Check] Restarting idle session ${session.id}\n`);
        session.kill();
        session.start();
      }
    });
  }
  
  getStatus() {
    return {
      poolSize: this.sessions.length,
      sessions: this.sessions.map(s => ({
        id: s.id,
        busy: s.busy,
        lastUsed: new Date(s.lastUsed).toISOString(),
        idleTime: Date.now() - s.lastUsed
      }))
    };
  }
}

// Create pool
const pool = new KiroSessionPool(POOL_SIZE);

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Status endpoint
  if (url.pathname === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(pool.getStatus()));
    return;
  }
  
  // Execute endpoint
  if (url.pathname === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
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
        res.end(JSON.stringify({
          success: true,
          ...result
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

const PORT = process.env.KIRO_POOL_PORT || 8082;
server.listen(PORT, () => {
  console.log(`🚀 Kiro Session Pool Server running on port ${PORT}`);
  console.log(`📊 Pool size: ${POOL_SIZE}`);
  console.log(`📝 Log file: ${LOG_FILE}`);
});
