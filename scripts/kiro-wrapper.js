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
const BUSY_TIMEOUT = 600000; // 10 minutes - match max Kiro processing time

class KiroWrapper {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.process = null;
    this.busy = false;
    this.lastActivity = Date.now();
    this.busyTimeout = null;
    
    this.start();
  }
  
  start() {
    console.log(`[Session ${this.sessionId}] Starting Kiro CLI...`);
    
    // Don't capture stdio - let Kiro execute curl commands directly
    this.process = spawn('/home/ec2-user/.local/bin/kiro-cli', ['chat', '--trust-all-tools'], {
      stdio: ['pipe', 'inherit', 'inherit'], // stdin piped, stdout/stderr inherited
      cwd: '/home/ec2-user/aipm'
    });
    
    this.process.on('close', (code) => {
      console.log(`[Session ${this.sessionId}] Process closed with code ${code}`);
      // Systemd will restart us
      process.exit(code || 1);
    });
    
    console.log(`[Session ${this.sessionId}] Started (PID: ${this.process.pid})`);
  }
  
  async execute(prompt) {
    if (this.busy) {
      throw new Error('Session is busy');
    }
    
    this.busy = true;
    this.lastActivity = Date.now();
    
    // Send prompt to Kiro
    console.log(`[Session ${this.sessionId}] Executing prompt (${prompt.length} chars)`);
    this.process.stdin.write(prompt + '\n');
    
    // Mark available after timeout (Kiro callbacks via curl, we don't wait for response)
    if (this.busyTimeout) {
      clearTimeout(this.busyTimeout);
    }
    
    this.busyTimeout = setTimeout(() => {
      this.busy = false;
      console.log(`[Session ${this.sessionId}] Marked available after timeout`);
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
  setTimeout(() => process.exit(0), 5000);
});
