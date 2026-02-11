#!/usr/bin/env node

/**
 * Kiro Session Pool - HTTP Router
 * Routes requests to available Kiro wrapper instances
 * No process management - wrappers are managed by systemd
 */

import http from 'http';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const POOL_SIZE = 2;
const WRAPPER_BASE_PORT = 9001;
const POOL_PORT = 8082;
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
const LOCK_FILE = '/tmp/kiro-session-pool.lock';
const PID_FILE = '/tmp/kiro-session-pool.pid';

// Lock file management
function checkExistingInstance() {
  if (existsSync(LOCK_FILE)) {
    try {
      const oldPid = parseInt(readFileSync(PID_FILE, 'utf8').trim());
      try {
        process.kill(oldPid, 0);
        console.error(`❌ Session pool already running (PID: ${oldPid})`);
        process.exit(1);
      } catch (e) {
        console.log('⚠️  Stale lock file, cleaning up...');
        unlinkSync(LOCK_FILE);
        unlinkSync(PID_FILE);
      }
    } catch (e) {
      try { unlinkSync(LOCK_FILE); } catch {}
      try { unlinkSync(PID_FILE); } catch {}
    }
  }
}

function createLockFile() {
  writeFileSync(PID_FILE, process.pid.toString());
  writeFileSync(LOCK_FILE, new Date().toISOString());
}

function removeLockFile() {
  try {
    unlinkSync(LOCK_FILE);
    unlinkSync(PID_FILE);
  } catch (e) {}
}

// Wrapper client
class WrapperClient {
  constructor(sessionId, port) {
    this.sessionId = sessionId;
    this.port = port;
    this.healthy = false;
    this.busy = false;
    this.lastCheck = 0;
  }
  
  async checkHealth() {
    try {
      const response = await fetch(`http://localhost:${this.port}/health`, {
        signal: AbortSignal.timeout(2000)
      });
      
      if (response.ok) {
        const data = await response.json();
        this.healthy = true;
        this.busy = data.busy;
        this.lastCheck = Date.now();
        return true;
      }
    } catch (e) {
      this.healthy = false;
    }
    return false;
  }
  
  async execute(prompt, requestId) {
    try {
      const response = await fetch(`http://localhost:${this.port}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, requestId }),
        signal: AbortSignal.timeout(600000) // 10 minutes
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      return data.result;
      
    } catch (e) {
      // Mark as unhealthy if request fails
      this.healthy = false;
      throw e;
    }
  }
}

// Session pool
class SessionPool {
  constructor(size) {
    this.wrappers = [];
    
    for (let i = 1; i <= size; i++) {
      this.wrappers.push(new WrapperClient(i, WRAPPER_BASE_PORT + i - 1));
    }
    
    this.queue = [];
    this.startHealthChecks();
  }
  
  startHealthChecks() {
    setInterval(async () => {
      for (const wrapper of this.wrappers) {
        await wrapper.checkHealth();
      }
    }, HEALTH_CHECK_INTERVAL);
    
    // Initial health check
    setTimeout(() => {
      for (const wrapper of this.wrappers) {
        wrapper.checkHealth();
      }
    }, 1000);
  }
  
  async execute(prompt, requestId) {
    // Find available wrapper
    const wrapper = this.wrappers.find(w => w.healthy && !w.busy);
    
    if (wrapper) {
      console.log(`[Pool] Routing to session ${wrapper.sessionId}`);
      wrapper.busy = true; // Mark busy immediately
      try {
        const result = await wrapper.execute(prompt, requestId);
        return result;
      } finally {
        wrapper.busy = false; // Mark available after completion
        // Process any queued requests now that wrapper is available
        setImmediate(() => this.processQueue());
      }
    }
    
    // All busy, queue request
    console.log(`[Pool] All sessions busy, queuing (queue: ${this.queue.length + 1})`);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.queue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new Error('Queue timeout'));
      }, 600000); // 10 minutes
      
      this.queue.push({ prompt, requestId, resolve, reject, timeout });
      
      // Try to process queue
      setTimeout(() => this.processQueue(), 1000);
    });
  }
  
  async processQueue() {
    if (this.queue.length === 0) return;
    
    const wrapper = this.wrappers.find(w => w.healthy && !w.busy);
    if (!wrapper) return;
    
    const item = this.queue.shift();
    if (!item) return;
    
    clearTimeout(item.timeout);
    
    console.log(`[Pool] Processing queued request (queue: ${this.queue.length})`);
    
    try {
      const result = await wrapper.execute(item.prompt, item.requestId);
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    }
    
    // Process next
    setTimeout(() => this.processQueue(), 100);
  }
  
  getStatus() {
    const available = this.wrappers.filter(w => w.healthy && !w.busy).length;
    const busy = this.wrappers.filter(w => w.busy).length;
    const unhealthy = this.wrappers.filter(w => !w.healthy).length;
    
    return {
      poolSize: this.wrappers.length,
      available,
      busy,
      unhealthy,
      queueLength: this.queue.length,
      wrappers: this.wrappers.map(w => ({
        sessionId: w.sessionId,
        port: w.port,
        healthy: w.healthy,
        busy: w.busy,
        lastCheck: w.lastCheck ? new Date(w.lastCheck).toISOString() : null
      }))
    };
  }
}

// Main
checkExistingInstance();
createLockFile();

const pool = new SessionPool(POOL_SIZE);

console.log(`✅ Kiro Session Pool started (PID: ${process.pid})`);
console.log(`   Pool size: ${POOL_SIZE}`);
console.log(`   Wrapper ports: ${WRAPPER_BASE_PORT}-${WRAPPER_BASE_PORT + POOL_SIZE - 1}`);

// HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (url.pathname === '/health') {
    const status = pool.getStatus();
    const healthy = status.available > 0;
    
    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: healthy ? 'healthy' : 'unhealthy',
      ...status
    }));
    return;
  }
  
  if (url.pathname === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prompt, requestId } = JSON.parse(body);
        const result = await pool.execute(prompt, requestId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', result }));
        
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }
  
  if (url.pathname === '/complete' && req.method === 'POST') {
    // Legacy endpoint for semantic API compatibility
    // HTTP pool doesn't need explicit completion notification
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success' }));
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

server.listen(POOL_PORT, () => {
  console.log(`✅ HTTP server listening on port ${POOL_PORT}`);
});

// Cleanup
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down...');
  removeLockFile();
  process.exit(0);
});

process.on('SIGTERM', () => {
  removeLockFile();
  process.exit(0);
});
