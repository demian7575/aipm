#!/usr/bin/env node
import http from 'http';
import pty from 'node-pty';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_PATH = resolve(__dirname, '../..');

const PORT = 8081;
const POOL_SIZE = 2;

const workers = [];

function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\x1b\[[\d;]*[A-Za-z]/g, '');
}

function createWorker(id) {
  const worker = {
    id,
    pty: null,
    busy: false,
    ready: false,
    output: '',
    lastActivity: Date.now(),
    currentTask: null,
    restartCount: 0,
    lastApprovalTime: 0
  };
  
  function startPty() {
    console.log(`🔄 Starting worker ${id}`);
    
    worker.pty = pty.spawn('kiro-cli', ['chat'], {
      name: 'xterm-color',
      cols: 120,
      rows: 30,
      cwd: REPO_PATH,
      env: process.env
    });

    worker.pty.onData((data) => {
      worker.output += data;
      const clean = stripAnsi(data);
      
      // Log all output for debugging
      if (clean.trim().length > 0) {
        console.log(`[Worker ${id}] ${clean}`);
      }
      
      // Detect ready state
      if (clean.includes('Model:')) {
        worker.ready = true;
      }
      
      // Auto-approve tool usage
      if (clean.includes('[y/n/t]') || clean.includes('Allow this action?')) {
        const now = Date.now();
        if (now - worker.lastApprovalTime > 2000) {
          console.log(`🔓 Auto-approving tool for worker ${id}`);
          worker.lastApprovalTime = now;
          setTimeout(() => worker.pty.write('t\r'), 200);
        }
      }
    });

    worker.pty.onExit(() => {
      console.log(`❌ Worker ${id} exited, restarting...`);
      worker.ready = false;
      worker.restartCount++;
      setTimeout(startPty, 2000);
    });
  }

  startPty();
  return worker;
}

for (let i = 1; i <= POOL_SIZE; i++) {
  workers.push(createWorker(i));
}

setTimeout(() => {
  console.log(`✅ ${workers.filter(w => w.ready).length} workers ready`);
}, 10000);

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      workers: workers.map(w => ({
        id: w.id,
        busy: w.busy,
        ready: w.ready,
        currentTask: w.currentTask,
        idle: Math.floor((Date.now() - w.lastActivity) / 1000),
        restarts: w.restartCount
      })),
      queued: 0,
      uptime: process.uptime()
    }));
    return;
  }

  if (req.url === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prompt, timeoutMs = 300000 } = JSON.parse(body);
        
        console.log(`📥 Request: ${prompt.substring(0, 50)}...`);
        
        const worker = workers.find(w => !w.busy && w.ready);
        if (!worker) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'No workers available' }));
          return;
        }

        worker.busy = true;
        worker.currentTask = prompt.substring(0, 50);
        worker.output = '';
        worker.lastActivity = Date.now();

        worker.pty.write(prompt + '\r');

        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const clean = stripAnsi(worker.output);
          
          // Check if complete (Kiro returns to prompt)
          if (clean.includes('Model:') && elapsed > 5000 && worker.output.length > 500) {
            clearInterval(checkInterval);
            worker.busy = false;
            worker.currentTask = null;
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              output: worker.output
            }));
          }
          
          // Timeout
          if (elapsed > timeoutMs) {
            clearInterval(checkInterval);
            worker.busy = false;
            worker.currentTask = null;
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              output: worker.output,
              timeout: true
            }));
          }
        }, 2000);

      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

function tryListen(port) {
  server.listen(port, () => {
    console.log(`🚀 Kiro API Server (Worker Pool) on port ${port}`);
    console.log(`👷 ${POOL_SIZE} persistent workers`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} in use, trying ${port + 1}`);
      tryListen(port + 1);
    } else {
      throw err;
    }
  });
}

tryListen(PORT);
