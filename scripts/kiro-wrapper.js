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
    this.busy = false;
    this.lastActivity = Date.now();
  }
  
  async execute(prompt) {
    if (this.busy) {
      throw new Error('Session is busy');
    }
    
    this.busy = true;
    this.lastActivity = Date.now();
    
    return new Promise((resolve, reject) => {
      console.log(`[Session ${this.sessionId}] Starting Kiro for request`);
      
      // Spawn Kiro and write prompt to stdin
      const kiroProcess = spawn('/home/ec2-user/.local/bin/kiro-cli', 
        ['chat', '--trust-all-tools'], 
        {
          cwd: '/home/ec2-user/aipm',
          env: process.env,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );
      
      // Write prompt to stdin
      kiroProcess.stdin.write(prompt + '\n');
      kiroProcess.stdin.end();
      
      let output = '';
      
      kiroProcess.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });
      
      kiroProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      
      kiroProcess.on('close', (exitCode) => {
        console.log(`[Session ${this.sessionId}] Kiro completed with code ${exitCode}`);
        this.busy = false;
        this.lastActivity = Date.now();
        
        if (exitCode === 0) {
          resolve('Request completed');
        } else {
          reject(new Error(`Kiro exited with code ${exitCode}`));
        }
      });
      
      // Timeout
      setTimeout(() => {
        kiroProcess.kill();
        this.busy = false;
        reject(new Error('Request timeout'));
      }, BUSY_TIMEOUT);
    });
  }
  
  getStatus() {
    return {
      sessionId: this.sessionId,
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
  setTimeout(() => process.exit(0), 1000);
});
