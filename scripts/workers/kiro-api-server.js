#!/usr/bin/env node
// Kiro REST API Server - Clean interface for code generation

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const PORT = process.env.KIRO_API_PORT || 8081;
const REPO_PATH = process.env.REPO_PATH || '/home/ec2-user/aipm';

// Active requests tracking
const activeRequests = new Map();
const requestQueue = [];
const MAX_CONCURRENT = 2; // Limit concurrent Kiro sessions
let activeCount = 0;

// Execute Kiro with prompt and return JSON
async function executeKiro(prompt, context = '', timeoutMs = 600000) {
  return new Promise((resolve, reject) => {
    // Add completion signal instruction
    const completionInstruction = '\n\nWhen completely done, output: [KIRO_COMPLETE]';
    const fullPrompt = context ? 
      `${context}\n\n${prompt}${completionInstruction}` : 
      `${prompt}${completionInstruction}`;
    
    const kiro = spawn('bash', ['-lc', 'kiro-cli chat'], {
      cwd: REPO_PATH,
      env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` }
    });

    let output = '';
    let lastOutputTime = Date.now();
    let hasGitCommit = false;
    let hasGitPush = false;
    
    const timeout = setTimeout(() => {
      kiro.kill('SIGKILL');
      resolve({ success: false, error: 'Timeout', output });
    }, timeoutMs);

    // Robust completion detection
    function checkCompletion() {
      const idle = Date.now() - lastOutputTime;
      
      // Method 1: Git operations completed (most reliable)
      if (hasGitCommit && hasGitPush && idle > 10000) {
        return true;
      }
      
      // Method 2: Idle after time marker (fallback)
      if (idle > 20000 && /▸ Time:.*\d+ms/.test(output)) {
        return true;
      }
      
      // Method 3: Explicit completion markers
      if (/\[KIRO_COMPLETE\]|Implementation complete|✅.*complete/i.test(output)) {
        return true;
      }
      
      return false;
    }

    // Check for completion every 5s
    const checkInterval = setInterval(() => {
      if (checkCompletion()) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        kiro.kill('SIGKILL');
        resolve({ success: true, output, hasGitCommit, hasGitPush });
      }
    }, 5000);

    kiro.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      lastOutputTime = Date.now();
      
      // Track git operations
      if (/git commit|committed|Committed changes/i.test(text)) {
        hasGitCommit = true;
      }
      if (/git push|pushed|Pushed to/i.test(text)) {
        hasGitPush = true;
      }
      
      // Auto-approve permissions
      if (text.includes('[y/n/t]')) {
        kiro.stdin.write('t\n');
      }
    });

    kiro.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      lastOutputTime = Date.now();
      
      // Track git operations (git outputs to stderr)
      if (/git commit|committed|Committed changes/i.test(text)) {
        hasGitCommit = true;
      }
      if (/git push|pushed|Pushed to/i.test(text)) {
        hasGitPush = true;
      }
    });

    kiro.on('exit', (code) => {
      clearTimeout(timeout);
      clearInterval(checkInterval);
      activeCount--;
      processQueue();
      
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({ success: false, error: `Exit code ${code}`, output });
      }
    });

    // Send prompt
    kiro.stdin.write(fullPrompt + '\n');
  });
}

// Queue management
async function executeWithQueue(prompt, context, timeoutMs) {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    return executeKiro(prompt, context, timeoutMs);
  }
  
  return new Promise((resolve) => {
    requestQueue.push({ prompt, context, timeoutMs, resolve });
  });
}

function processQueue() {
  while (activeCount < MAX_CONCURRENT && requestQueue.length > 0) {
    const { prompt, context, timeoutMs, resolve } = requestQueue.shift();
    activeCount++;
    executeKiro(prompt, context, timeoutMs).then(resolve);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      activeRequests: activeCount,
      queuedRequests: requestQueue.length,
      maxConcurrent: MAX_CONCURRENT,
      uptime: process.uptime()
    }));
    return;
  }
  
  // Execute Kiro
  if (url.pathname === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      try {
        const { prompt, context, timeoutMs } = JSON.parse(body);
        
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'prompt required' }));
          return;
        }
        
        console.log(`📥 Request ${requestId}: ${prompt.substring(0, 50)}...`);
        activeRequests.set(requestId, { startTime: Date.now(), prompt });
        
        const result = await executeWithQueue(prompt, context, timeoutMs);
        
        activeRequests.delete(requestId);
        console.log(`✅ Request ${requestId} completed`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        
      } catch (error) {
        activeRequests.delete(requestId);
        console.error(`❌ Request ${requestId} failed:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🚀 Kiro API Server listening on port ${PORT}`);
  console.log(`📁 Repository: ${REPO_PATH}`);
  console.log(`🔗 POST /execute - Execute Kiro with prompt`);
  console.log(`🔗 GET /health - Health check`);
});
