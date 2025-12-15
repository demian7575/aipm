#!/usr/bin/env node

import http from 'http';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      service: 'terminal-server',
      port: 8080,
      uptime: process.uptime(),
      websocket: 'enabled'
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// WebSocket server for terminal connections
const wss = new WebSocketServer({ 
  server,
  path: '/terminal'
});

wss.on('connection', (ws, req) => {
  console.log('New terminal connection');
  
  // Send welcome message
  ws.send('🔌 Connected to Kiro CLI terminal\r\n');
  ws.send('💬 Start chatting with Kiro to refine your code!\r\n\r\n');
  
  // Spawn kiro-cli chat process
  const kiro = spawn('kiro-cli', ['chat'], {
    cwd: '/home/ec2-user/aipm',
    env: { ...process.env, TERM: 'xterm-256color' }
  });
  
  // Forward terminal output to WebSocket
  kiro.stdout.on('data', (data) => {
    ws.send(data.toString());
  });
  
  kiro.stderr.on('data', (data) => {
    ws.send(data.toString());
  });
  
  // Forward WebSocket input to terminal
  ws.on('message', (data) => {
    kiro.stdin.write(data);
  });
  
  // Handle connection close
  ws.on('close', () => {
    console.log('Terminal connection closed');
    kiro.kill();
  });
  
  kiro.on('exit', (code) => {
    console.log(`Kiro CLI exited with code ${code}`);
    ws.close();
  });
});

const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Terminal Server with WebSocket running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
