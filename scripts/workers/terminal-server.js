#!/usr/bin/env node
// Terminal server for EC2 - handles Kiro CLI WebSocket connections + HTTP API

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import pty from 'node-pty';
import { execSync } from 'node:child_process';

const PORT = process.env.PORT || 8080;
const REPO_PATH = process.env.REPO_PATH || '/home/ec2-user/aipm';

// Start single persistent Kiro session
console.log('🚀 Starting persistent Kiro session...');
const kiro = pty.spawn('bash', ['-c', `cd ${REPO_PATH} && cat scripts/utilities/load-context.sh | bash && kiro-cli chat`], {
  name: 'xterm-256color',
  cols: 120,
  rows: 30,
  cwd: REPO_PATH,
  env: process.env
});

console.log(`✅ Kiro CLI started (PID: ${kiro.pid})`);
console.log('📋 Loading AIPM context...');

// Track all connected clients
const clients = new Set();

// Broadcast Kiro output to all connected clients
kiro.onData((data) => {
  clients.forEach(client => {
    try {
      sendWSMessage(client.socket, { type: 'output', data });
    } catch (e) {
      clients.delete(client);
    }
  });
});

kiro.onExit(({ exitCode }) => {
  console.error(`❌ Kiro exited unexpectedly (code: ${exitCode})`);
  process.exit(1);
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Health check
  if (url.pathname === '/' || url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      kiro: { pid: kiro.pid, running: !kiro.killed }
    }));
    return;
  }
  
  // Restart Kiro endpoint
  if (url.pathname === '/restart-kiro' && req.method === 'POST') {
    try {
      console.log('🔄 Restarting Kiro CLI...');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Server will restart' }));
      setTimeout(() => process.exit(0), 1000);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
    return;
  }
  
  // Code generation endpoint
  if (url.pathname === '/generate-code' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { branch, taskDescription, prNumber } = JSON.parse(body);
        
        if (!branch || !taskDescription) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'branch and taskDescription required' }));
          return;
        }
        
        console.log(`\n🔨 Generating code for PR #${prNumber}`);
        console.log(`🌿 Branch: ${branch}`);
        console.log(`📋 Task: ${taskDescription}`);
        
        // Capture Kiro output
        let kiroOutput = '';
        const outputHandler = (data) => {
          kiroOutput += data;
          process.stdout.write(data); // Also log to console
        };
        
        kiro.onData(outputHandler);
        
        // Checkout branch (clean working directory first)
        try {
          console.log('📥 Cleaning working directory...');
          execSync(`cd ${REPO_PATH} && git clean -fd && git reset --hard`, { encoding: 'utf8' });
          console.log('📥 Fetching and checking out branch...');
          const gitCheckout = execSync(`cd ${REPO_PATH} && git fetch origin && git checkout ${branch}`, { encoding: 'utf8' });
          console.log(gitCheckout);
        } catch (gitError) {
          console.error('❌ Git checkout failed:', gitError.message);
          throw new Error(`Failed to checkout branch: ${gitError.message}`);
        }
        
        // Send task to Kiro with explicit instructions
        console.log('🤖 Sending task to Kiro CLI...');
        console.log('📝 Task:', taskDescription);
        
        // Format prompt for better Kiro understanding
        const prompt = `Please implement the following task:

${taskDescription}

Create or modify files as needed. When done, type "done" or just wait.`;
        
        kiro.write(prompt + '\n');
        console.log('✅ Prompt sent');
        
        // Wait a moment for Kiro to process, then send Enter to execute
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('⏎ Sending Enter key to execute...');
        kiro.write('\r');
        
        console.log('⏳ Waiting for Kiro to generate code...');
        
        // Send approval multiple times during generation (Kiro may ask for permission)
        for (let i = 0; i < 6; i++) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Every 10 seconds
          console.log(`✅ Sending approval (${i + 1}/6)...`);
          kiro.write('y\r');
        }
        
        console.log('⏰ 30 seconds elapsed');
        console.log('📊 Kiro output length:', kiroOutput.length, 'characters');
        console.log('📊 Last 500 chars:', kiroOutput.substring(Math.max(0, kiroOutput.length - 500)));
        
        // Remove output handler
        kiro.removeListener('data', outputHandler);
        
        // Check if any files changed
        console.log('🔍 Checking for file changes...');
        const gitStatus = execSync(`cd ${REPO_PATH} && git status --porcelain`, { encoding: 'utf8' });
        console.log('📊 Git status:', gitStatus || '(no changes)');
        
        // Commit and push
        let gitOutput = '';
        try {
          gitOutput = execSync(`cd ${REPO_PATH} && git add . && git commit -m "feat: ${taskDescription.substring(0, 50)}" && git push origin ${branch}`, { encoding: 'utf8' });
          
          console.log(`✅ Code generated and pushed to ${branch}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Code generated successfully',
            branch,
            kiroOutput: kiroOutput.substring(kiroOutput.length - 2000), // Last 2000 chars
            gitOutput
          }));
        } catch (gitError) {
          if (gitError.message.includes('nothing to commit')) {
            console.log(`⚠️  No changes generated`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: 'No changes needed',
              branch,
              kiroOutput: kiroOutput.substring(kiroOutput.length - 2000),
              gitOutput: 'No changes to commit'
            }));
          } else {
            throw gitError;
          }
        }
      } catch (error) {
        console.error(`❌ Code generation failed:`, error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
    return;
  }
  
  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found\n');
});

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  
  if (url.pathname === '/terminal') {
    handleTerminalWebSocket(req, socket, head, url);
  } else {
    socket.destroy();
  }
});

function handleTerminalWebSocket(req, socket, head, url) {
  const branch = url.searchParams.get('branch') || 'main';
  
  // WebSocket handshake
  const key = req.headers['sec-websocket-key'];
  const hash = createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${hash}\r\n` +
    'Access-Control-Allow-Origin: *\r\n' +
    '\r\n'
  );
  
  console.log(`[${new Date().toISOString()}] Client connected (branch: ${branch})`);
  
  // Initialize buffer with any data from head
  let buffer = Buffer.from(head);
  
  // Add client to broadcast list
  const client = { socket, branch };
  clients.add(client);
  
  // Send branch info and welcome
  sendWSMessage(socket, { type: 'branch', branch });
  sendWSMessage(socket, { type: 'output', data: `✓ Connected to Kiro session\r\n` });
  
  // Handle WebSocket messages (user input)
  // buffer already initialized above with head data
  
  socket.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);
      
      while (buffer.length >= 2) {
        const frame = parseWSFrame(buffer);
        if (!frame) break;
        
        buffer = buffer.slice(frame.length);
        
        if (frame.opcode === 0x8) {
          // Close frame
          console.log(`[${new Date().toISOString()}] Client disconnected`);
          clients.delete(client);
          socket.end();
          return;
        }
        
        if (frame.opcode === 0x1 || frame.opcode === 0x2) {
          // Text or binary frame - send to shared Kiro session
          try {
            const message = JSON.parse(frame.payload.toString());
            if (message.type === 'input') {
              kiro.write(message.data);
            }
          } catch (e) {
            console.error(`[${new Date().toISOString()}] Parse error:`, e.message);
          }
        }
      }
    });
    
    socket.on('close', () => {
      console.log(`[${new Date().toISOString()}] Client disconnected`);
      clients.delete(client);
    });
    
    socket.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] Socket error:`, err);
      clients.delete(client);
    });
}

function sendWSMessage(socket, data) {
  const payload = JSON.stringify(data);
  const length = Buffer.byteLength(payload);
  
  let frame;
  if (length < 126) {
    frame = Buffer.alloc(2 + length);
    frame[0] = 0x81; // FIN + text frame
    frame[1] = length;
    frame.write(payload, 2);
  } else if (length < 65536) {
    frame = Buffer.alloc(4 + length);
    frame[0] = 0x81;
    frame[1] = 126;
    frame.writeUInt16BE(length, 2);
    frame.write(payload, 4);
  } else {
    frame = Buffer.alloc(10 + length);
    frame[0] = 0x81;
    frame[1] = 127;
    frame.writeBigUInt64BE(BigInt(length), 2);
    frame.write(payload, 10);
  }
  
  socket.write(frame);
}

function parseWSFrame(buffer) {
  if (buffer.length < 2) return null;
  
  const opcode = buffer[0] & 0x0f;
  const masked = (buffer[1] & 0x80) === 0x80;
  let length = buffer[1] & 0x7f;
  let offset = 2;
  
  if (length === 126) {
    if (buffer.length < 4) return null;
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    if (buffer.length < 10) return null;
    length = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }
  
  if (masked) {
    if (buffer.length < offset + 4 + length) return null;
    const mask = buffer.slice(offset, offset + 4);
    offset += 4;
    const payload = Buffer.alloc(length);
    for (let i = 0; i < length; i++) {
      payload[i] = buffer[offset + i] ^ mask[i % 4];
    }
    return { opcode, payload, length: offset + length };
  } else {
    if (buffer.length < offset + length) return null;
    return { opcode, payload: buffer.slice(offset, offset + length), length: offset + length };
  }
}

server.listen(PORT, () => {
  console.log(`🚀 Kiro Terminal Server listening on port ${PORT}`);
  console.log(`📁 Repository path: ${REPO_PATH}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}/terminal?branch=<branch-name>`);
  console.log(`🔗 Code generation: POST http://localhost:${PORT}/generate-code`);
});
