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
    ready: false,
    output: '',
    lastActivity: Date.now(),
    currentTask: null,
    restartCount: 0,
    lastApprovalTime: 0
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
      worker.lastActivity = Date.now();
      
      // Log Kiro output - sanitize for safe logging
      const cleanData = text
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/\x1b\[[\?0-9;]*[A-Za-z]/g, '')
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\r/g, '')
        .trim();
      
      if (cleanData.length > 0 && worker.busy) {
        const safeData = cleanData
          .substring(0, 200)
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n');
        console.log(`📝 Worker ${id}: ${safeData}`);
      }
      
      // Auto-approve permissions - check for complete prompt
      const recentOutput = worker.output.slice(-1000);
      const timeSinceLastApproval = Date.now() - worker.lastApprovalTime;
      
      const hasCompletePrompt = 
        (recentOutput.includes('[y/n/t]:') || 
         (recentOutput.includes('y/n/t') && recentOutput.includes(']:'))) &&
        timeSinceLastApproval > 2000;
      
      if (hasCompletePrompt) {
        console.log(`🔓 Worker ${id}: Auto-approving permission`);
        setTimeout(() => {
          worker.pty.stdin.write('y\n');
        }, 200);
        worker.lastApprovalTime = Date.now();
      }
      
      // Mark as ready when we see the prompt
      if (!worker.ready && text.includes('Model:')) {
        worker.ready = true;
        console.log(`✅ Worker ${id}: Ready`);
      }
    });
    
    worker.pty.stderr.on('data', (data) => {
      console.log(`⚠️  Worker ${id} stderr: ${data.toString().substring(0, 200)}`);
    });
    
    worker.pty.on('exit', (code) => {
      console.log(`⚠️  Worker ${id} exited with code ${code}, restarting...`);
      worker.ready = false;
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
setTimeout(() => {
  console.log(`✅ ${POOL_SIZE} workers ready`);
}, 3000);

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
        console.log(`📝 Worker ${worker.id}: commit detected`);
        hasGitCommit = true;
      }
      if (/git push|pushed|branch.*->/i.test(worker.output) && !hasGitPush) {
        console.log(`🚀 Worker ${worker.id}: push detected`);
        hasGitPush = true;
      }
      
      // Completion detection
      if (hasGitCommit && hasGitPush && idle > 10000) {
        console.log(`✅ Worker ${worker.id}: complete (git operations)`);
        clearTimeout(timeout);
        clearInterval(checkInterval);
        worker.busy = false;
        worker.currentTask = null;
        resolve({ success: true, output: worker.output, hasGitCommit, hasGitPush });
      } else if (idle > 60000 && elapsed > 60000) {
        console.log(`⚠️  Worker ${worker.id}: complete (idle timeout)`);
        clearTimeout(timeout);
        clearInterval(checkInterval);
        worker.busy = false;
        worker.currentTask = null;
        resolve({ success: false, output: worker.output, hasGitCommit, hasGitPush });
      }
    }, 3000);
    
    // Send prompt
    console.log(`📤 Worker ${worker.id}: sending prompt`);
    worker.pty.stdin.write(prompt + '\n');
  });
}

// Get available worker
function getAvailableWorker() {
  return workers.find(w => !w.busy && w.pty && w.ready);
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
    processQueue();
  });
}

// Health check
function getHealth() {
  return {
    status: 'running',
    workers: workers.map(w => ({
      id: w.id,
      busy: w.busy,
      ready: w.ready,
      currentTask: w.currentTask,
      idle: Math.floor((Date.now() - w.lastActivity) / 1000),
      restarts: w.restartCount
    })),
    queued: queue.length,
    uptime: process.uptime()
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getHealth()));
    return;
  }
  
  if (req.url === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prompt, context, timeoutMs } = JSON.parse(body);
        console.log(`📥 Request: ${prompt.substring(0, 50)}...`);
        const result = await execute(prompt, context, timeoutMs || 600000);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
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

// Health monitor - kill stuck workers
setInterval(() => {
  workers.forEach(worker => {
    if (worker.busy && Date.now() - worker.lastActivity > 300000) {
      console.log(`💀 Killing stuck worker ${worker.id}`);
      worker.pty.kill();
    }
  });
}, 60000);
