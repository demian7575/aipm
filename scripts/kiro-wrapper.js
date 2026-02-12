#!/usr/bin/env node

/**
 * Kiro Wrapper - Simplified direct PTY approach
 * No bash, no HTTP complexity - just PTY → Kiro
 */

import pty from 'node-pty';
import http from 'http';

const SESSION_ID = process.argv[2] || '1';
const PORT = parseInt(process.argv[3]) || 9000 + parseInt(SESSION_ID);

class KiroWrapper {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.pty = null;
    this.busy = false;
    this.outputBuffer = '';
    this.currentResolve = null;
    this.currentReject = null;
    this.currentPrompt = null;
    this.requestTimeout = null;
    this.lastActivity = Date.now();
    
    this.completionMarkers = ['SEMANTIC-API Task Complete', '▸ Time:'];
  }

  start() {
    console.log(`[Session ${this.sessionId}] Starting Kiro CLI...`);
    
    this.pty = pty.spawn('/home/ec2-user/.local/bin/kiro-cli', ['chat', '--trust-all-tools'], {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd: '/home/ec2-user/aipm',
      env: process.env
    });

    this.pty.onData(data => {
      this.lastActivity = Date.now();
      this.outputBuffer += data;
      
      // Log output for debugging
      const text = data.toString();
      if (text.includes('!>') || text.includes('Task Complete') || text.includes('Time:') || text.includes('Terminated')) {
        console.log(`[Session ${this.sessionId}] [OUTPUT] ${text}`);
      }
      
      // Check for completion
      if (this.busy && this.completionMarkers.some(marker => this.outputBuffer.includes(marker))) {
        this.handleCompletion();
      }
    });

    this.pty.onExit(({ exitCode, signal }) => {
      const busyState = this.busy ? 'BUSY' : 'IDLE';
      const promptInfo = this.currentPrompt ? `prompt="${this.currentPrompt.substring(0, 50)}..."` : 'no prompt';
      console.log(`[Session ${this.sessionId}] Kiro exited (code=${exitCode}, signal=${signal}, state=${busyState}, ${promptInfo}), restarting...`);
      
      if (this.currentReject) {
        this.currentReject(new Error('Kiro exited unexpectedly'));
        this.currentReject = null;
        this.currentResolve = null;
      }
      
      this.busy = false;
      setTimeout(() => this.start(), 1000);
    });

    console.log(`[Session ${this.sessionId}] Kiro started (PID: ${this.pty.pid})`);
  }

  async execute(prompt) {
    if (this.busy) {
      throw new Error('Session is busy');
    }

    if (!this.pty) {
      throw new Error('PTY not initialized');
    }

    this.busy = true;
    this.outputBuffer = '';
    this.currentPrompt = prompt;
    
    console.log(`[Session ${this.sessionId}] [STDIN] ${prompt}`);

    return new Promise((resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;

      this.pty.write(prompt + '\n');

      this.requestTimeout = setTimeout(() => {
        this.busy = false;
        this.currentReject = null;
        this.currentResolve = null;
        reject(new Error('Request timeout after 5 minutes'));
      }, 300000);
    });
  }

  handleCompletion() {
    if (this.requestTimeout) {
      clearTimeout(this.requestTimeout);
      this.requestTimeout = null;
    }

    this.busy = false;
    console.log(`[Session ${this.sessionId}] Request completed`);

    if (this.currentResolve) {
      this.currentResolve({ status: 'completed' });
      this.currentResolve = null;
      this.currentReject = null;
    }
  }

  getStatus() {
    return {
      sessionId: this.sessionId,
      pid: this.pty?.pid || null,
      busy: this.busy,
      lastActivity: new Date(this.lastActivity).toISOString(),
      idleTime: Date.now() - this.lastActivity
    };
  }
}

// Create and start wrapper
const wrapper = new KiroWrapper(SESSION_ID);
wrapper.start();

// HTTP server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', ...wrapper.getStatus() }));
    return;
  }

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

process.on('SIGTERM', () => {
  console.log(`[Session ${SESSION_ID}] Received SIGTERM, shutting down...`);
  if (wrapper.pty) {
    wrapper.pty.kill();
  }
  setTimeout(() => process.exit(0), 1000);
});

console.log(`[Session ${SESSION_ID}] Kiro Wrapper started`);
