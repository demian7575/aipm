#!/usr/bin/env node
// Terminal server for EC2 - handles Kiro CLI WebSocket connections

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const PORT = process.env.PORT || 8080;
const REPO_PATH = process.env.REPO_PATH || '/home/ec2-user/aipm';

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Kiro Terminal Server Running\n');
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
  
  console.log(`[${new Date().toISOString()}] New terminal session: branch=${branch}`);
  
  // Send branch info
  sendWSMessage(socket, { type: 'branch', branch });
  
  // Checkout branch
  const checkoutResult = spawn('git', ['checkout', branch], { cwd: REPO_PATH });
  checkoutResult.on('close', (code) => {
    if (code !== 0) {
      sendWSMessage(socket, { type: 'output', data: `❌ Failed to checkout branch: ${branch}\r\n` });
      socket.end();
      return;
    }
    
    sendWSMessage(socket, { type: 'output', data: `✓ Checked out branch: ${branch}\r\n\r\n` });
    
    // Start kiro-cli chat
    const kiro = spawn('kiro-cli', ['chat'], {
      cwd: REPO_PATH,
      env: { ...process.env, TERM: 'xterm-256color' }
    });
    
    console.log(`[${new Date().toISOString()}] Started Kiro CLI (PID: ${kiro.pid})`);
    
    // Pipe kiro output to WebSocket
    kiro.stdout.on('data', (data) => {
      sendWSMessage(socket, { type: 'output', data: data.toString() });
    });
    
    kiro.stderr.on('data', (data) => {
      sendWSMessage(socket, { type: 'output', data: data.toString() });
    });
    
    kiro.on('close', (code) => {
      console.log(`[${new Date().toISOString()}] Kiro exited (code: ${code})`);
      sendWSMessage(socket, { type: 'output', data: `\r\n✓ Kiro exited (code ${code})\r\n` });
      
      // Return to main branch
      spawn('git', ['checkout', 'main'], { cwd: REPO_PATH });
      sendWSMessage(socket, { type: 'output', data: '✓ Returned to main branch\r\n' });
      
      socket.end();
    });
    
    // Handle WebSocket messages (user input)
    let buffer = Buffer.alloc(0);
    
    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      
      while (buffer.length >= 2) {
        const frame = parseWSFrame(buffer);
        if (!frame) break;
        
        buffer = buffer.slice(frame.length);
        
        if (frame.opcode === 0x8) {
          // Close frame
          console.log(`[${new Date().toISOString()}] Client closed connection`);
          kiro.kill();
          socket.end();
          return;
        }
        
        if (frame.opcode === 0x1 || frame.opcode === 0x2) {
          // Text or binary frame
          try {
            const message = JSON.parse(frame.payload.toString());
            if (message.type === 'input') {
              kiro.stdin.write(message.data);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });
    
    socket.on('close', () => {
      console.log(`[${new Date().toISOString()}] Socket closed`);
      kiro.kill();
      spawn('git', ['checkout', 'main'], { cwd: REPO_PATH });
    });
    
    socket.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] Socket error:`, err);
      kiro.kill();
      spawn('git', ['checkout', 'main'], { cwd: REPO_PATH });
    });
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
});
