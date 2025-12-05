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
const requestQueue = [];

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

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
      worker.lastActivity = Date.now();
      const clean = stripAnsi(data);
      
      // Log all output for debugging
      if (clean.trim().length > 0) {
        console.log(`[Worker ${id}] ${clean}`);
      }
      
      // Detect ready state
      if (!worker.ready && clean.includes('Model:')) {
        worker.ready = true;
        processQueue();
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
      worker.busy = false;
      worker.currentTask = null;
      worker.restartCount++;
      setTimeout(startPty, 2000);
      processQueue();
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

function getActiveCount() {
  return workers.filter(w => w.busy).length;
}

function enqueueRequest(task) {
  requestQueue.push(task);
}

function processQueue() {
  const availableWorker = workers.find(w => !w.busy && w.ready);
  if (!availableWorker) return;

  const nextTask = requestQueue.shift();
  if (!nextTask) return;

  nextTask(availableWorker);
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    const body = JSON.stringify({
      status: 'running',
      workers: workers.map(w => ({
        id: w.id,
        busy: w.busy,
        ready: w.ready,
        currentTask: w.currentTask,
        idle: Math.floor((Date.now() - w.lastActivity) / 1000),
        restarts: w.restartCount
      })),
      activeRequests: getActiveCount(),
      queuedRequests: requestQueue.length,
      maxConcurrent: POOL_SIZE,
      uptime: process.uptime()
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });

    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(body);
    }
    return;
  }

  if (req.url === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const { prompt, timeoutMs = 300000 } = parsed;

        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'prompt required' }));
          return;
        }

        console.log(`📥 Request: ${prompt.substring(0, 50)}...`);

        const taskHandler = (worker) => {
          worker.busy = true;
          worker.currentTask = prompt.substring(0, 50);
          worker.output = '';
          worker.lastActivity = Date.now();

          worker.pty.write(prompt + '\r');

          const startTime = Date.now();
          const checkInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const clean = stripAnsi(worker.output);

            if (clean.includes('Model:') && elapsed > 5000 && worker.output.length > 500) {
              clearInterval(checkInterval);
              worker.busy = false;
              worker.currentTask = null;
              processQueue();

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                output: worker.output
              }));
            }

            if (elapsed > timeoutMs) {
              clearInterval(checkInterval);
              worker.busy = false;
              worker.currentTask = null;
              processQueue();

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                output: worker.output,
                timeout: true
              }));
            }
          }, 2000);
        };

        const availableWorker = workers.find(w => !w.busy && w.ready);
        if (availableWorker) {
          taskHandler(availableWorker);
        } else {
          enqueueRequest(taskHandler);
        }
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
