#!/usr/bin/env node
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_PATH = resolve(__dirname, '../..');

const PORT = 8081;
const POOL_SIZE = 2;

const workers = [];

function createWorker(id) {
  const worker = {
    id,
    pty: null,
    busy: false,
    ready: true,
    output: '',
    lastActivity: Date.now(),
    currentTask: null,
    restartCount: 0
  };
  
  function startPty() {
    console.log(`🔄 Starting worker ${id}`);
    
    worker.pty = spawn('kiro-cli', ['chat'], {
      cwd: REPO_PATH,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    worker.pty.stdout.on('data', (data) => {
      const text = data.toString();
      worker.output += text;
      if (text.includes('Model:')) {
        worker.ready = true;
      }
    });

    worker.pty.stderr.on('data', (data) => {
      console.log(`⚠️  Worker ${id} stderr:`, data.toString().substring(0, 200));
    });

    worker.pty.on('exit', () => {
      console.log(`❌ Worker ${id} exited, restarting...`);
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
  console.log(`✅ ${workers.length} workers ready`);
}, 5000);

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
        const { prompt, timeoutMs = 120000 } = JSON.parse(body);
        
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

        worker.pty.stdin.write(prompt + '\n');

        const timeout = setTimeout(() => {
          worker.busy = false;
          worker.currentTask = null;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            output: worker.output,
            timeout: true
          }));
        }, timeoutMs);

        const checkComplete = setInterval(() => {
          if (worker.output.includes('Model:') && worker.output.length > 1000) {
            clearTimeout(timeout);
            clearInterval(checkComplete);
            worker.busy = false;
            worker.currentTask = null;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              output: worker.output
            }));
          }
        }, 1000);

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
