#!/usr/bin/env node
// Kiro API Server - Persistent Worker Pool

import { createServer } from 'node:http';
import pty from 'node-pty';

const PORT = process.env.KIRO_API_PORT || 8081;
const REPO_PATH = process.env.REPO_PATH || '/home/ec2-user/aipm';
const POOL_SIZE = 2;

// Worker pool
const workers = [];

// Initialize worker
function createWorker(id) {
  const worker = {
    id,
    pty: null,
    busy: false,
    output: '',
    lastActivity: Date.now(),
    currentTask: null,
    restartCount: 0
  };
  
  function startPty() {
    console.log(`🔄 Starting worker ${id}`);
    
    worker.pty = pty.spawn('kiro-cli', ['chat'], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: REPO_PATH,
      env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` }
    });
    
    worker.pty.onData((data) => {
      worker.output += data;
      worker.lastActivity = Date.now();
      
      // Auto-approve permissions
      if (data.includes('[y/n/t]')) {
        worker.pty.write('t\r');
      }
    });
    
    worker.pty.onExit(() => {
      console.log(`⚠️  Worker ${id} exited, restarting...`);
      worker.restartCount++;
      setTimeout(() => startPty(), 2000);
    });
  }
  
  startPty();
  return worker;
}

// Initialize pool
for (let i = 0; i < POOL_SIZE; i++) {
  workers.push(createWorker(i + 1));
}

// Wait for workers to be ready
await new Promise(resolve => setTimeout(resolve, 3000));
console.log(`✅ ${POOL_SIZE} workers ready`);

// Execute task on worker
async function executeOnWorker(worker, prompt, timeoutMs = 600000) {
  return new Promise((resolve) => {
    worker.busy = true;
    worker.output = '';
    worker.currentTask = prompt.substring(0, 50);
    worker.lastActivity = Date.now();
    
    let hasGitCommit = false;
    let hasGitPush = false;
    let taskStartTime = Date.now();
    
    const timeout = setTimeout(() => {
      console.log(`⏱️  Worker ${worker.id} timeout`);
      worker.busy = false;
      worker.currentTask = null;
      resolve({ success: false, error: 'Timeout', output: worker.output });
    }, timeoutMs);
    
    const checkInterval = setInterval(() => {
      const idle = Date.now() - worker.lastActivity;
      const elapsed = Date.now() - taskStartTime;
      
      // Check git operations
      if (/git commit|committed|files? changed/i.test(worker.output) && !hasGitCommit) {
        console.log(`📝 Worker ${worker.id}: commit`);
        hasGitCommit = true;
      }
      if (/git push|pushed|branch.*->/i.test(worker.output) && !hasGitPush) {
        console.log(`🚀 Worker ${worker.id}: push`);
        hasGitPush = true;
      }
      
      // Completion detection
      if (hasGitCommit && hasGitPush && idle > 10000) {
        console.log(`✅ Worker ${worker.id}: complete (git)`);
        clearTimeout(timeout);
        clearInterval(checkInterval);
        worker.busy = false;
        worker.currentTask = null;
        resolve({ success: true, output: worker.output, hasGitCommit, hasGitPush });
      } else if (idle > 60000 && elapsed > 60000) {
        console.log(`⚠️  Worker ${worker.id}: complete (idle)`);
        clearTimeout(timeout);
        clearInterval(checkInterval);
        worker.busy = false;
        worker.currentTask = null;
        resolve({ success: true, output: worker.output, hasGitCommit, hasGitPush });
      }
    }, 3000);
    
    // Send prompt
    console.log(`📤 Worker ${worker.id}: sending prompt`);
    worker.pty.write(prompt + '\r');
  });
}

// Get available worker
function getAvailableWorker() {
  return workers.find(w => !w.busy && w.pty);
}

// Request queue
const queue = [];

async function processQueue() {
  while (queue.length > 0) {
    const worker = getAvailableWorker();
    if (!worker) break;
    
    const { prompt, context, timeoutMs, resolve } = queue.shift();
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
    const result = await executeOnWorker(worker, fullPrompt, timeoutMs);
    resolve(result);
  }
}

// Execute with queue
async function execute(prompt, context, timeoutMs) {
  const worker = getAvailableWorker();
  if (worker) {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
    return executeOnWorker(worker, fullPrompt, timeoutMs);
  }
  
  return new Promise((resolve) => {
    queue.push({ prompt, context, timeoutMs, resolve });
  });
}

// Health monitor
setInterval(() => {
  workers.forEach(w => {
    const idle = Date.now() - w.lastActivity;
    if (w.busy && idle > 300000) { // 5 min stuck
      console.log(`⚠️  Worker ${w.id} stuck, restarting`);
      w.pty.kill();
      w.busy = false;
      w.currentTask = null;
    }
  });
  processQueue();
}, 30000);

// HTTP Server
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (url.pathname === '/health') {
    const status = workers.map(w => ({
      id: w.id,
      busy: w.busy,
      currentTask: w.currentTask,
      idle: Math.floor((Date.now() - w.lastActivity) / 1000),
      restarts: w.restartCount
    }));
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      workers: status,
      queued: queue.length,
      uptime: process.uptime()
    }));
    return;
  }
  
  if (url.pathname === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prompt, context, timeoutMs } = JSON.parse(body);
        
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'prompt required' }));
          return;
        }
        
        console.log(`📥 Request: ${prompt.substring(0, 50)}...`);
        const result = await execute(prompt, context, timeoutMs);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        
      } catch (error) {
        console.error(`❌ Error:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🚀 Kiro API Server (Worker Pool) on port ${PORT}`);
  console.log(`👷 ${POOL_SIZE} persistent workers`);
});
