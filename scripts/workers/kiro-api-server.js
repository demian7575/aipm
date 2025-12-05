#!/usr/bin/env node
// Kiro REST API Server - Clean interface for code generation

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const PORT = process.env.KIRO_API_PORT || 8081;
const REPO_PATH = process.env.REPO_PATH || '/home/ec2-user/aipm';

// Active requests tracking
const activeRequests = new Map();

// Execute Kiro with prompt and return JSON
async function executeKiro(prompt, context = '', timeoutMs = 600000) {
  return new Promise((resolve, reject) => {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
    
    const kiro = spawn('bash', ['-lc', 'kiro-cli chat'], {
      cwd: REPO_PATH,
      env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` }
    });

    let output = '';
    let lastOutputTime = Date.now();
    
    const timeout = setTimeout(() => {
      kiro.kill('SIGKILL');
      resolve({ success: false, error: 'Timeout', output });
    }, timeoutMs);

    // Check for completion every 5s
    const checkInterval = setInterval(() => {
      const idle = Date.now() - lastOutputTime;
      if (idle > 20000 && output.includes('▸ Time:')) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        kiro.kill('SIGKILL');
        
        // Try to extract JSON from output
        const jsonMatch = output.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            const result = JSON.parse(jsonMatch[0]);
            resolve({ success: true, result, output });
            return;
          } catch (e) {}
        }
        
        resolve({ success: true, output });
      }
    }, 5000);

    kiro.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      lastOutputTime = Date.now();
      
      // Auto-approve permissions
      if (text.includes('[y/n/t]')) {
        kiro.stdin.write('t\n');
      }
      
      // Check for completion signals
      if (text.includes('[KIRO_COMPLETE]') || 
          text.includes('Implementation complete') ||
          (text.includes('Done.') && text.includes('▸ Time:'))) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        kiro.kill('SIGKILL');
        
        const jsonMatch = output.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            const result = JSON.parse(jsonMatch[0]);
            resolve({ success: true, result, output });
            return;
          } catch (e) {}
        }
        
        resolve({ success: true, output });
      }
    });

    kiro.stderr.on('data', (chunk) => {
      output += chunk.toString();
      lastOutputTime = Date.now();
    });

    kiro.on('exit', (code) => {
      clearTimeout(timeout);
      clearInterval(checkInterval);
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
      activeRequests: activeRequests.size,
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
        
        const result = await executeKiro(prompt, context, timeoutMs);
        
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
