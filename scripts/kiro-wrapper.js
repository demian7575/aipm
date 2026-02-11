#!/usr/bin/env node

/**
 * Kiro Wrapper - Persistent Kiro session with bash shell
 * Based on Codex's approach: spawn bash → launch Kiro → send prompts via write()
 */

import pty from 'node-pty';
import http from 'http';
import { EventEmitter } from 'events';

const SESSION_ID = process.argv[2] || '1';
const PORT = parseInt(process.argv[3]) || 9000 + parseInt(SESSION_ID);

class KiroWrapper extends EventEmitter {
  constructor(sessionId) {
    super();
    this.sessionId = sessionId;
    this.pty = null;
    this.busy = false;
    this.lastActivity = Date.now();
    this.outputBuffer = '';
    this.currentResolve = null;
    this.currentReject = null;
    this.requestTimeout = null;
    
    // Completion markers
    this.completionMarkers = ['SEMANTIC-API Task Complete', '▸ Time:'];
  }

  start() {
    console.log(`[Session ${this.sessionId}] Starting bash shell...`);
    
    // Spawn interactive login shell
    this.pty = pty.spawn('bash', ['--login', '-i'], {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd: '/home/ec2-user/aipm',
      env: process.env
    });

    this.pty.onData(data => {
      this.lastActivity = Date.now();
      this.outputBuffer += data;
      
      // Check for completion
      if (this.busy && this.completionMarkers.some(marker => this.outputBuffer.includes(marker))) {
        this.handleCompletion();
      }
    });

    // Launch Kiro after shell is ready
    setTimeout(() => {
      console.log(`[Session ${this.sessionId}] Launching Kiro CLI...`);
      this.pty.write('kiro-cli chat --trust-all-tools\n');
    }, 500);

    // Hang monitor
    setInterval(() => {
      if (this.busy && Date.now() - this.lastActivity > 120000) {
        console.log(`[Session ${this.sessionId}] Detected hang, restarting...`);
        this.restart();
      }
    }, 5000);
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
    
    const promptPreview = prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt;
    console.log(`[Session ${this.sessionId}] [STDIN] ${promptPreview}`);

    return new Promise((resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;

      // Send prompt to Kiro
      this.pty.write(prompt + '\n');

      // Timeout after 5 minutes
      this.requestTimeout = setTimeout(() => {
        this.busy = false;
        this.currentReject = null;
        this.currentResolve = null;
        reject(new Error('Request timeout'));
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

  restart() {
    console.log(`[Session ${this.sessionId}] Restarting Kiro...`);
    
    if (this.pty) {
      this.pty.kill();
    }

    if (this.currentReject) {
      this.currentReject(new Error('Session restarted'));
      this.currentReject = null;
      this.currentResolve = null;
    }

    this.busy = false;
    this.outputBuffer = '';
    
    setTimeout(() => this.start(), 1000);
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

// Create wrapper instance
const wrapper = new KiroWrapper(SESSION_ID);
wrapper.start();

// HTTP server
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

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
  if (wrapper.pty) {
    wrapper.pty.write('exit\n');
  }
  setTimeout(() => process.exit(0), 1000);
});

console.log(`[Session ${SESSION_ID}] Kiro Wrapper started`);
