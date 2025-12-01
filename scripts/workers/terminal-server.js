#!/usr/bin/env node
// Terminal server for EC2 - handles Kiro CLI WebSocket connections + queue processing

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import pty from 'node-pty';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { execSync } from 'node:child_process';

const PORT = process.env.PORT || 8080;
const REPO_PATH = process.env.REPO_PATH || '/home/ec2-user/aipm';
const QUEUE_TABLE = 'aipm-amazon-q-queue';
const POLL_INTERVAL = 5000; // 5 seconds

// DynamoDB client
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

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

// Queue processing functions
async function getPendingTasks() {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: QUEUE_TABLE,
      FilterExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':pending': 'pending' }
    }));
    return result.Items || [];
  } catch (error) {
    console.error('❌ Failed to scan queue:', error.message);
    return [];
  }
}

async function updateTaskStatus(taskId, status, error = null) {
  try {
    await docClient.send(new UpdateCommand({
      TableName: QUEUE_TABLE,
      Key: { id: taskId },
      UpdateExpression: 'SET #status = :status, updatedAt = :now' + (error ? ', #error = :error' : ''),
      ExpressionAttributeNames: { 
        '#status': 'status',
        ...(error ? { '#error': 'error' } : {})
      },
      ExpressionAttributeValues: { 
        ':status': status,
        ':now': new Date().toISOString(),
        ...(error ? { ':error': error } : {})
      }
    }));
  } catch (err) {
    console.error(`❌ Failed to update task ${taskId}:`, err.message);
  }
}

async function processTask(task) {
  console.log(`\n🔨 Processing task: ${task.id}`);
  console.log(`📋 Title: ${task.title}`);
  console.log(`🌿 Branch: ${task.branch}`);
  
  await updateTaskStatus(task.id, 'processing');
  
  try {
    // Checkout branch
    console.log(`📥 Checking out branch...`);
    execSync(`cd ${REPO_PATH} && git fetch origin && git checkout ${task.branch}`, { stdio: 'inherit' });
    
    // Send task to Kiro via the persistent session
    console.log(`🤖 Sending to Kiro CLI...`);
    const command = `Implement this task: ${task.details}\n`;
    kiro.write(command);
    
    // Wait for Kiro to finish (simple timeout approach)
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    
    // Commit and push
    console.log(`💾 Committing changes...`);
    try {
      execSync(`cd ${REPO_PATH} && git add . && git commit -m "feat: ${task.title}" && git push origin ${task.branch}`, { stdio: 'inherit' });
      console.log(`✅ Task completed: ${task.id}`);
      await updateTaskStatus(task.id, 'complete');
    } catch (gitError) {
      if (gitError.message.includes('nothing to commit')) {
        console.log(`⚠️  No changes generated`);
        await updateTaskStatus(task.id, 'complete', 'No changes generated');
      } else {
        throw gitError;
      }
    }
  } catch (error) {
    console.error(`❌ Task failed: ${error.message}`);
    await updateTaskStatus(task.id, 'failed', error.message);
  }
}

async function pollQueue() {
  const tasks = await getPendingTasks();
  if (tasks.length > 0) {
    console.log(`\n📬 Found ${tasks.length} pending task(s)`);
    for (const task of tasks) {
      await processTask(task);
    }
  }
}

// Start queue polling
console.log(`🔄 Starting queue polling (every ${POLL_INTERVAL}ms)...`);
setInterval(pollQueue, POLL_INTERVAL);

server.listen(PORT, () => {
  console.log(`🚀 Kiro Terminal Server listening on port ${PORT}`);
  console.log(`📁 Repository path: ${REPO_PATH}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}/terminal?branch=<branch-name>`);
  console.log(`📬 Queue polling: ${QUEUE_TABLE}`);
});
