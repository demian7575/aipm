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
    
    // Don't start Kiro yet - start on first request
  }
  
  start() {
    console.log(`[Session ${this.sessionId}] Starting Kiro CLI...`);
    
    // Start Kiro in interactive mode (no --no-interactive flag)
    this.process = spawn('/home/ec2-user/.local/bin/kiro-cli', ['chat', '--trust-all-tools'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: '/home/ec2-user/aipm'
    });
    
    // Capture stdout
    this.process.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output); // Pass through to systemd log
      this.outputBuffer += output;
      this.checkIfReady(output);
    });
    
    // Capture stderr (Kiro outputs here)
    this.process.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(output); // Pass through to systemd log
      this.outputBuffer += output;
      this.checkIfReady(output);
    });
    
    this.process.on('close', (code) => {
      console.log(`[Session ${this.sessionId}] Kiro process closed with code ${code}`);
      this.process = null;
      this.markAvailable();
    });
    
    console.log(`[Session ${this.sessionId}] Started (PID: ${this.process.pid})`);
  }
  
  restart() {
    console.log(`[Session ${this.sessionId}] Timeout - exiting for systemd restart`);
    
    // Kill Kiro process
    if (this.process) {
      this.process.kill('SIGTERM');
    }
    
    // Exit wrapper - systemd will restart it cleanly
    process.exit(1);
  }
  
  checkIfReady(output) {
    // Strip ANSI codes before checking
    const clean = output.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
    
    // Kiro shows various completion indicators when done
    const completionIndicators = [
      'Task Complete',
      'You:',
      'analysis complete',
      'complete. Posted results',
      '▸ Time:'
    ];
    
    if (this.busy && completionIndicators.some(indicator => clean.includes(indicator))) {
      console.log(`[Session ${this.sessionId}] Kiro ready for next input`);
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
    
    // Start Kiro if not running
    if (!this.process) {
      this.start();
      // Wait for Kiro to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    this.busy = true;
    this.lastActivity = Date.now();
    this.outputBuffer = ''; // Clear buffer for new request
    
    // Send prompt to Kiro
    console.log(`[Session ${this.sessionId}] Executing prompt (${prompt.length} chars)`);
    console.log(`[Session ${this.sessionId}] Prompt: ${prompt}`);
    this.process.stdin.write(prompt + '\n');
    
    // Safety timeout - restart Kiro if it doesn't complete
    this.busyTimeout = setTimeout(() => {
      console.log(`[Session ${this.sessionId}] Timeout - restarting Kiro`);
      this.restart();
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
