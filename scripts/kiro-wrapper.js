#!/usr/bin/env node

/**
 * Kiro Wrapper - Single session HTTP server
 * Manages one Kiro CLI process and exposes HTTP API
 * Kiro executes curl commands directly to callback to semantic API
 * 
 * Usage: node kiro-wrapper.js <session-id> <port>
 * Example: node kiro-wrapper.js 1 9001
 */

import { spawn } from 'child_process';
import http from 'http';

const SESSION_ID = process.argv[2] || '1';
const PORT = parseInt(process.argv[3]) || 9000 + parseInt(SESSION_ID);
const BUSY_TIMEOUT = 300000; // 5 minutes - enough for code generation

class KiroWrapper {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.process = null;
    this.busy = false;
    this.outputBuffer = '';
    this.lastActivity = Date.now();
    this.busyTimeout = null;
    
    this.start();
  }
  
  start() {
    console.log(`[Session ${this.sessionId}] Starting Kiro CLI...`);
    
    // Use script command to create a PTY session
    // -q: quiet (no start/done messages)
    // -f: flush output after each write
    // -e: return exit code of child
    this.process = spawn('script', 
      ['-q', '-f', '-e', '-c', '/home/ec2-user/.local/bin/kiro-cli chat --trust-all-tools', '/dev/null'], 
      {
        cwd: '/home/ec2-user/aipm',
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
    
    // CRITICAL: Keep stdin open by not ending it
    // The key is that the pipe stays open as long as we don't call stdin.end()
    this.process.stdin.setEncoding('utf8');
    
    // Prevent stdin from closing on error
    this.process.stdin.on('error', (err) => {
      console.log(`[Session ${this.sessionId}] Stdin error (ignored): ${err.message}`);
    });
    
    this.process.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);
      this.outputBuffer += output;
      this.checkIfReady(output);
    });
    
    this.process.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(output);
      this.outputBuffer += output;
      this.checkIfReady(output);
    });
    
    this.process.on('close', (code) => {
      console.log(`[Session ${this.sessionId}] Kiro process closed with code ${code}`);
      this.process = null;
      
      // Always restart
      console.log(`[Session ${this.sessionId}] Restarting Kiro...`);
      setTimeout(() => this.start(), 2000);
    });
    
    console.log(`[Session ${this.sessionId}] Started (PID: ${this.process.pid})`);
  }
  
  checkIfReady(output) {
    const clean = output.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
    
    const completionIndicators = [
      'SEMANTIC-API Task Complete',
      '▸ Time:'
    ];
    
    if (this.busy && completionIndicators.some(indicator => clean.includes(indicator))) {
      console.log(`[Session ${this.sessionId}] Task completed`);
      this.markAvailable();
    }
  }
  
  markAvailable() {
    this.busy = false;
    if (this.busyTimeout) {
      clearTimeout(this.busyTimeout);
      this.busyTimeout = null;
    }
  }
  
  async execute(prompt) {
    if (this.busy) {
      throw new Error('Session is busy');
    }
    
    if (!this.process) {
      this.start();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    this.busy = true;
    this.lastActivity = Date.now();
    this.outputBuffer = '';
    
    console.log(`[Session ${this.sessionId}] Executing prompt (${prompt.length} chars)`);
    this.process.stdin.write(prompt + '\n');
    
    this.busyTimeout = setTimeout(() => {
      console.log(`[Session ${this.sessionId}] Timeout - restarting`);
      if (this.process) {
        this.process.kill();
      }
      this.busy = false;
      this.start();
    }, BUSY_TIMEOUT);
    
    return 'Request sent to Kiro';
  }
  
  getStatus() {
    return {
      sessionId: this.sessionId,
      pid: this.process?.pid,
      busy: this.busy,
      lastActivity: new Date(this.lastActivity).toISOString(),
      idleTime: Date.now() - this.lastActivity
    };
  }
}

// Create wrapper
const wrapper = new KiroWrapper(SESSION_ID);

// HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy',
      ...wrapper.getStatus()
    }));
    return;
  }
  
  // Execute prompt
  if (url.pathname === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prompt } = JSON.parse(body);
        const result = await wrapper.execute(prompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', result }));
      } catch (err) {
        res.writeHead(err.message.includes('busy') ? 503 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, sessionId: SESSION_ID }));
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[Session ${SESSION_ID}] HTTP server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[Session ${SESSION_ID}] Received SIGTERM, shutting down...`);
  if (wrapper.process) {
    wrapper.process.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 1000);
});
