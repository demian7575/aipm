#!/usr/bin/env node

/**
 * Semantic API with Direct Kiro Integration
 * No wrapper, no HTTP session pool - just PTY → Kiro
 */

import http from 'http';
import pty from 'node-pty';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'semantic-api', 'templates');
const PORT = 8083;

// Single Kiro instance
let kiroPty = null;
let kiroReady = false;
let currentRequest = null;
let outputBuffer = '';

function startKiro() {
  console.log('Starting Kiro CLI...');
  
  kiroPty = pty.spawn('/home/ec2-user/.local/bin/kiro-cli', ['chat', '--trust-all-tools'], {
    name: 'xterm-256color',
    cols: 120,
    rows: 40,
    cwd: '/home/ec2-user/aipm',
    env: process.env
  });

  kiroPty.onData(data => {
    outputBuffer += data;
    
    // Detect ready
    if (!kiroReady && data.includes('!>')) {
      kiroReady = true;
      console.log('Kiro ready');
    }
    
    // Detect completion
    if (currentRequest && (data.includes('SEMANTIC-API Task Complete') || data.includes('▸ Time:'))) {
      console.log('Task completed');
      if (currentRequest.resolve) {
        currentRequest.resolve();
        currentRequest = null;
      }
    }
  });

  kiroPty.onExit(({ exitCode, signal }) => {
    console.log(`Kiro exited (code=${exitCode}, signal=${signal}), restarting...`);
    kiroReady = false;
    if (currentRequest && currentRequest.reject) {
      currentRequest.reject(new Error('Kiro exited'));
      currentRequest = null;
    }
    setTimeout(startKiro, 1000);
  });
}

async function executePrompt(prompt) {
  if (!kiroReady) {
    throw new Error('Kiro not ready');
  }
  
  if (currentRequest) {
    throw new Error('Kiro is busy');
  }

  outputBuffer = '';
  
  return new Promise((resolve, reject) => {
    currentRequest = { resolve, reject };
    
    kiroPty.write(prompt + '\n');
    
    // Timeout after 5 minutes
    setTimeout(() => {
      if (currentRequest) {
        currentRequest = null;
        reject(new Error('Timeout'));
      }
    }, 300000);
  });
}

// Start Kiro
startKiro();

// HTTP Server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Use-Dev-Tables');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: kiroReady ? 'healthy' : 'starting',
      kiroReady,
      busy: currentRequest !== null
    }));
    return;
  }

  if (url.pathname === '/aipm/story-draft' && req.method === 'POST') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const params = JSON.parse(body);
        console.log('Story draft request:', params.requestId);

        // Load template
        const templatePath = join(TEMPLATES_DIR, 'POST-aipm-story-draft.md');
        const template = await readFile(templatePath, 'utf-8');
        
        // Build prompt
        const prompt = `Read and execute template at ${templatePath}. Input data: ${JSON.stringify(params)}`;
        
        // Execute
        await executePrompt(prompt);
        
        res.write(`data: ${JSON.stringify({ status: 'completed' })}\n\n`);
        res.end();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
        res.end();
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Semantic API listening on port ${PORT}`);
});
