#!/usr/bin/env node

/**
 * Kiro Wrapper - Single session HTTP server
 * Manages one Kiro CLI process and exposes HTTP API
 * 
 * Usage: node kiro-wrapper.js <session-id> <port>
 * Example: node kiro-wrapper.js 1 9001
 */

import { spawn } from 'child_process';
import http from 'http';

const SESSION_ID = process.argv[2] || '1';
const PORT = parseInt(process.argv[3]) || 9000 + parseInt(SESSION_ID);
const COMPLETION_TIMEOUT = 600000; // 10 minutes max per request

class KiroWrapper {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.process = null;
    this.busy = false;
    this.outputBuffer = '';
    this.currentResolve = null;
    this.currentReject = null;
    this.lastActivity = Date.now();
    this.completionTimer = null;
    
    this.start();
  }
  
  start() {
    console.log(`[Session ${this.sessionId}] Starting Kiro CLI...`);
    
    this.process = spawn('/home/ec2-user/.local/bin/kiro-cli', ['chat', '--trust-all-tools'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.process.stdout.on('data', (data) => {
      const chunk = data.toString();
      this.outputBuffer += chunk;
      this.lastActivity = Date.now();
      
      // Detect completion signals
      if (this.detectCompletion(chunk)) {
        this.complete();
      }
    });
    
    this.process.stderr.on('data', (data) => {
      console.error(`[Session ${this.sessionId}] stderr:`, data.toString());
    });
    
    this.process.on('close', (code) => {
      console.log(`[Session ${this.sessionId}] Process closed with code ${code}`);
      if (this.currentReject) {
        this.currentReject(new Error('Kiro process closed'));
      }
      // Systemd will restart us
      process.exit(code || 1);
    });
    
    console.log(`[Session ${this.sessionId}] Started (PID: ${this.process.pid})`);
  }
  
  detectCompletion(chunk) {
    // Look for Kiro completion signals
    return chunk.includes('TASK COMPLETE') || 
           chunk.includes('You:') ||
           chunk.match(/\n\s*$/); // Empty line after output
  }
  
  async execute(prompt) {
    if (this.busy) {
      throw new Error('Session is busy');
    }
    
    this.busy = true;
    this.outputBuffer = '';
    this.lastActivity = Date.now();
    
    return new Promise((resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;
      
      // Set completion timeout
      this.completionTimer = setTimeout(() => {
        this.complete(new Error('Request timeout'));
      }, COMPLETION_TIMEOUT);
      
      // Send prompt to Kiro
      console.log(`[Session ${this.sessionId}] Executing prompt (${prompt.length} chars)`);
      this.process.stdin.write(prompt + '\n');
    });
  }
  
  complete(error = null) {
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
    
    if (error) {
      console.error(`[Session ${this.sessionId}] Completed with error:`, error.message);
      if (this.currentReject) {
        this.currentReject(error);
      }
    } else {
      console.log(`[Session ${this.sessionId}] Completed successfully (${this.outputBuffer.length} chars)`);
      if (this.currentResolve) {
        this.currentResolve(this.outputBuffer);
      }
    }
    
    this.currentResolve = null;
    this.currentReject = null;
    this.busy = false;
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
        
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing prompt' }));
          return;
        }
        
        const result = await wrapper.execute(prompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'success',
          result,
          sessionId: SESSION_ID
        }));
        
      } catch (err) {
        res.writeHead(err.message.includes('busy') ? 503 : 500, { 
          'Content-Type': 'application/json' 
        });
        res.end(JSON.stringify({ 
          error: err.message,
          sessionId: SESSION_ID
        }));
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
  server.close();
  if (wrapper.process) {
    wrapper.process.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 5000);
});
