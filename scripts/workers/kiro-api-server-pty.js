#!/usr/bin/env node
// Kiro REST API Server - PTY-based for proper terminal emulation

import { createServer } from 'node:http';
import pty from 'node-pty';

const PORT = process.env.KIRO_API_PORT || 8081;
const REPO_PATH = process.env.REPO_PATH || '/home/ec2-user/aipm';
const MAX_CONCURRENT = 2;

const activeRequests = new Map();
const requestQueue = [];
let activeCount = 0;

async function executeKiro(prompt, context = '', timeoutMs = 600000) {
  return new Promise((resolve) => {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
    
    let output = '';
    let lastOutputTime = Date.now();
    let hasGitCommit = false;
    let hasGitPush = false;
    let promptSent = false;
    
    const kiro = pty.spawn('kiro-cli', ['chat'], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: REPO_PATH,
      env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` }
    });
    
    const timeout = setTimeout(() => {
      console.log('⏱️  Timeout');
      kiro.kill();
      resolve({ success: false, error: 'Timeout', output });
    }, timeoutMs);

    const checkInterval = setInterval(() => {
      const idle = Date.now() - lastOutputTime;
      
      if (hasGitCommit && hasGitPush && idle > 10000) {
        console.log('✅ Complete: git + 10s idle');
        clearTimeout(timeout);
        clearInterval(checkInterval);
        kiro.kill();
        resolve({ success: true, output, hasGitCommit, hasGitPush });
      } else if (idle > 60000) {
        console.log('⚠️  Complete: 60s idle');
        clearTimeout(timeout);
        clearInterval(checkInterval);
        kiro.kill();
        resolve({ success: true, output, hasGitCommit, hasGitPush });
      }
    }, 3000);

    kiro.onData((data) => {
      output += data;
      lastOutputTime = Date.now();
      
      if (!promptSent && data.includes('Model:')) {
        console.log('📤 Sending prompt');
        setTimeout(() => kiro.write(fullPrompt + '\r'), 1000);
        promptSent = true;
      }
      
      if (/git commit|committed|files? changed/i.test(data) && !hasGitCommit) {
        console.log('📝 Commit');
        hasGitCommit = true;
      }
      if (/git push|pushed|branch.*->/i.test(data) && !hasGitPush) {
        console.log('🚀 Push');
        hasGitPush = true;
      }
      
      if (data.includes('[y/n/t]')) {
        kiro.write('t\r');
      }
    });

    kiro.onExit(() => {
      clearTimeout(timeout);
      clearInterval(checkInterval);
      activeCount--;
      processQueue();
      resolve({ success: true, output });
    });
  });
}

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
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
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
  
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🚀 Kiro API Server (PTY) listening on port ${PORT}`);
  console.log(`📁 Repository: ${REPO_PATH}`);
});
