#!/usr/bin/env node

import http from 'http';
import crypto from 'crypto';

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
      websocket: 'native'
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Handle WebSocket upgrade using native Node.js
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  
  if (url.pathname !== '/terminal') {
    socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
    return;
  }

  // WebSocket handshake
  const key = request.headers['sec-websocket-key'];
  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '', ''
  ].join('\r\n');

  socket.write(responseHeaders);

  // Send welcome message
  const welcomeMsg = '🔌 Connected to Kiro CLI terminal\r\n💬 Type your message to interact with Kiro!\r\n\r\n';
  const frame = createWebSocketFrame(welcomeMsg);
  socket.write(frame);

  // Handle incoming WebSocket frames
  socket.on('data', (buffer) => {
    try {
      const message = parseWebSocketFrame(buffer);
      if (message) {
        // Echo back the message (simulate Kiro response)
        const response = `Kiro: I received "${message.trim()}". How can I help you refine this story?\r\n`;
        const responseFrame = createWebSocketFrame(response);
        socket.write(responseFrame);
      }
    } catch (error) {
      console.error('WebSocket frame parsing error:', error);
    }
  });

  socket.on('close', () => {
    console.log('Terminal connection closed');
  });
});

function createWebSocketFrame(data) {
  const payload = Buffer.from(data, 'utf8');
  const payloadLength = payload.length;
  
  let frame;
  if (payloadLength < 126) {
    frame = Buffer.allocUnsafe(2 + payloadLength);
    frame[0] = 0x81; // FIN + text frame
    frame[1] = payloadLength;
    payload.copy(frame, 2);
  } else if (payloadLength < 65536) {
    frame = Buffer.allocUnsafe(4 + payloadLength);
    frame[0] = 0x81;
    frame[1] = 126;
    frame.writeUInt16BE(payloadLength, 2);
    payload.copy(frame, 4);
  } else {
    frame = Buffer.allocUnsafe(10 + payloadLength);
    frame[0] = 0x81;
    frame[1] = 127;
    frame.writeUInt32BE(0, 2);
    frame.writeUInt32BE(payloadLength, 6);
    payload.copy(frame, 10);
  }
  
  return frame;
}

function parseWebSocketFrame(buffer) {
  if (buffer.length < 2) return null;
  
  const firstByte = buffer[0];
  const secondByte = buffer[1];
  
  const opcode = firstByte & 0x0f;
  if (opcode !== 0x01) return null; // Only handle text frames
  
  const masked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;
  
  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    payloadLength = buffer.readUInt32BE(6);
    offset = 10;
  }
  
  if (masked) {
    const maskKey = buffer.slice(offset, offset + 4);
    offset += 4;
    const payload = buffer.slice(offset, offset + payloadLength);
    
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskKey[i % 4];
    }
    
    return payload.toString('utf8');
  }
  
  return buffer.slice(offset, offset + payloadLength).toString('utf8');
}

const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Terminal Server with native WebSocket running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
