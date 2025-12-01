#!/usr/bin/env node
// Terminal server for EC2 - handles Kiro CLI WebSocket connections

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import pty from 'node-pty';

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
  
  // Initialize buffer with any data from head
  let buffer = Buffer.from(head);
  
  // Send branch info
  sendWSMessage(socket, { type: 'branch', branch });
  
  // Checkout branch first
  sendWSMessage(socket, { type: 'output', data: `✓ Checked out branch: ${branch}\r\n\r\n` });
  
  // Start kiro-cli with PTY
  const kiro = pty.spawn('bash', ['-c', `cd ${REPO_PATH} && git checkout ${branch} 2>/dev/null && kiro-cli chat`], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: REPO_PATH,
    env: process.env
  });
  
  console.log(`[${new Date().toISOString()}] Started Kiro CLI (PID: ${kiro.pid})`);
  
  // Wait for Kiro to be ready, then load context
  let kiroReady = false;
  
  // Pipe kiro output to WebSocket
  kiro.onData((data) => {
    sendWSMessage(socket, { type: 'output', data });
    
    // Detect when Kiro is ready (shows prompt or welcome message)
    if (!kiroReady && (data.includes('How can I help') || data.includes('What can I help'))) {
      kiroReady = true;
      console.log(`[${new Date().toISOString()}] Kiro ready, loading context...`);
      
      // Send load-context command
      setTimeout(() => {
        kiro.write('./bin/load-context\r');
      }, 500);
    }
  });
  
  kiro.onExit(({ exitCode }) => {
    console.log(`[${new Date().toISOString()}] Kiro exited (code: ${exitCode})`);
    sendWSMessage(socket, { type: 'output', data: `\r\n✓ Kiro exited (code ${exitCode})\r\n` });
    sendWSMessage(socket, { type: 'output', data: '✓ Returned to main branch\r\n' });
    socket.end();
  });
  
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
          console.log(`[${new Date().toISOString()}] Client closed connection`);
          kiro.kill();
          socket.end();
          return;
        }
        
        if (frame.opcode === 0x1 || frame.opcode === 0x2) {
          // Text or binary frame
          console.log(`[${new Date().toISOString()}] Received frame:`, frame.payload.toString());
          try {
            const message = JSON.parse(frame.payload.toString());
            console.log(`[${new Date().toISOString()}] Parsed message:`, message);
            if (message.type === 'input') {
              console.log(`[${new Date().toISOString()}] Writing to Kiro:`, message.data);
              kiro.write(message.data);
            }
          } catch (e) {
            console.error(`[${new Date().toISOString()}] Parse error:`, e.message);
          }
        }
      }
    });
    
    socket.on('close', () => {
      console.log(`[${new Date().toISOString()}] Socket closed`);
      kiro.kill();
    });
    
    socket.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] Socket error:`, err);
      kiro.kill();
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
