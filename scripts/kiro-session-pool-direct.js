#!/usr/bin/env node

/**
 * Simplified Kiro Session Pool - Direct PTY Management
 * No wrapper processes, just PTY → Kiro
 */

import http from 'http';
import pty from 'node-pty';

const POOL_SIZE = 2;
const PORT = 8082;

class KiroSession {
  constructor(id) {
    this.id = id;
    this.pty = null;
    this.busy = false;
    this.ready = false;
    this.outputBuffer = '';
    this.currentResolve = null;
    this.currentReject = null;
    this.timeout = null;
    this.start();
  }

  start() {
    console.log(`[Session ${this.id}] Starting Kiro...`);
    
    this.pty = pty.spawn('/home/ec2-user/.local/bin/kiro-cli', ['chat', '--trust-all-tools'], {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd: '/home/ec2-user/aipm',
      env: process.env
    });

    this.pty.onData(data => {
      console.log(`[Session ${this.id}] PTY:`, data.substring(0, 200));
      this.outputBuffer += data;
      
      if (!this.ready && data.includes('!>')) {
        this.ready = true;
        console.log(`[Session ${this.id}] Ready`);
      }
      
      if (this.busy && (data.includes('SEMANTIC-API Task Complete') || data.includes('▸ Time:'))) {
        this.handleComplete();
      }
    });

    this.pty.onExit(({ exitCode, signal }) => {
      console.log(`[Session ${this.id}] Exited (code=${exitCode}, signal=${signal})`);
      this.ready = false;
      if (this.currentReject) {
        this.currentReject(new Error('Kiro exited'));
        this.currentReject = null;
        this.currentResolve = null;
      }
      this.busy = false;
      setTimeout(() => this.start(), 1000);
    });
  }

  async execute(prompt) {
    if (this.busy) {
      throw new Error('Session busy');
    }
    
    if (!this.ready) {
      throw new Error('Session not ready');
    }

    this.busy = true;
    this.outputBuffer = '';
    
    console.log(`[Session ${this.id}] Executing: ${prompt.substring(0, 100)}...`);

    return new Promise((resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;

      this.pty.write(prompt + '\n');

      this.timeout = setTimeout(() => {
        this.busy = false;
        this.currentReject = null;
        this.currentResolve = null;
        reject(new Error('Timeout'));
      }, 300000);
    });
  }

  handleComplete() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    this.busy = false;
    console.log(`[Session ${this.id}] Completed`);

    if (this.currentResolve) {
      this.currentResolve({ status: 'success' });
      this.currentResolve = null;
      this.currentReject = null;
    }
  }

  getStatus() {
    return {
      id: this.id,
      ready: this.ready,
      busy: this.busy,
      pid: this.pty?.pid || null
    };
  }
}

// Create session pool
const sessions = [];
for (let i = 0; i < POOL_SIZE; i++) {
  sessions.push(new KiroSession(i + 1));
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    const available = sessions.filter(s => s.ready && !s.busy).length;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: available > 0 ? 'healthy' : 'unhealthy',
      poolSize: POOL_SIZE,
      available,
      busy: sessions.filter(s => s.busy).length,
      sessions: sessions.map(s => s.getStatus())
    }));
    return;
  }

  if (url.pathname === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prompt } = JSON.parse(body);
        
        // Find available session
        const session = sessions.find(s => s.ready && !s.busy);
        if (!session) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'All sessions busy' }));
          return;
        }

        await session.execute(prompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Session pool listening on port ${PORT}`);
});
