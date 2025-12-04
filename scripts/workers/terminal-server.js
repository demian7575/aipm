#!/usr/bin/env node
// Terminal server for EC2 - handles Kiro CLI WebSocket connections + HTTP API

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import pty from 'node-pty';
import { execSync, spawn } from 'node:child_process';

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

async function runNonInteractiveKiro(prompt, { timeoutMs = 600000 } = {}) {
  return await new Promise((resolve, reject) => {
    const kiroProcess = spawn('bash', ['-lc', `cd ${REPO_PATH} && source scripts/utilities/load-context.sh && kiro-cli chat`], {
      env: process.env,
      cwd: REPO_PATH
    });

    let output = '';
    let finished = false;

    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      try { kiroProcess.kill('SIGKILL'); } catch (e) { /* ignore */ }
      resolve({ ...result, output });
    };

    const timeoutId = setTimeout(() => {
      console.warn('⏰ Kiro non-interactive run timed out');
      finish({ success: false, timedOut: true });
    }, timeoutMs);

    let completionDetected = false;
    
    const handleData = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);

      if (text.includes('Allow this action?') || text.includes('[y/n/t]')) {
        console.log('🔔 Permission prompt detected (non-interactive), sending trust (t)...');
        kiroProcess.stdin.write('t\n');
      }

      // Check last 500 chars of accumulated output for completion signal
      const recentOutput = output.substring(Math.max(0, output.length - 500));
      if (!completionDetected && recentOutput.includes('[KIRO_COMPLETE]')) {
        completionDetected = true;
        console.log('✅ Kiro completion signal detected, sending /quit...');
        kiroProcess.stdin.write('/quit\n');
      }
    };

    kiroProcess.stdout.on('data', handleData);
    kiroProcess.stderr.on('data', handleData);

    kiroProcess.on('exit', (code) => {
      if (!finished) {
        finish({ success: completionDetected || code === 0, exitCode: code });
      }
    });

    kiroProcess.on('error', (err) => {
      if (!finished) {
        clearTimeout(timeoutId);
        reject(err);
      }
    });

    kiroProcess.stdin.write(`${prompt}\n`);
  });
}

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

function getTerminalHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kiro CLI Terminal</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #fff;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: #2a2a2a;
      padding: 12px 20px;
      border-bottom: 1px solid #444;
    }
    .header h1 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .header p {
      font-size: 13px;
      color: #aaa;
    }
    #terminal-container {
      flex: 1;
      padding: 10px;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Kiro CLI Terminal</h1>
    <p id="pr-info">Loading...</p>
  </div>
  <div id="terminal-container"></div>

  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js"></script>
  <script>
    const params = new URLSearchParams(window.location.search);
    const prId = params.get('prId') || 'unknown';
    const branchName = params.get('branchName') || 'main';
    const taskTitle = params.get('taskTitle') || 'Development task';

    document.getElementById('pr-info').textContent = \`PR #\${prId} - \${taskTitle} (\${branchName})\`;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff'
      }
    });

    const fitAddon = new FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(document.getElementById('terminal-container'));
    fitAddon.fit();

    window.addEventListener('resize', () => fitAddon.fit());

    const wsUrl = \`ws://\${window.location.host}/terminal?branch=\${encodeURIComponent(branchName)}\`;
    
    terminal.writeln('🔌 Connecting to Kiro CLI...');
    terminal.writeln(\`📡 Server: \${wsUrl}\`);
    terminal.writeln('');
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      terminal.writeln('✅ Connected to Kiro CLI');
      terminal.writeln('');
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output' && msg.data) {
          terminal.write(msg.data);
        }
      } catch (e) {
        terminal.write(event.data);
      }
    };

    socket.onerror = (error) => {
      terminal.writeln('\\r\\n❌ Connection error');
      console.error('WebSocket error:', error);
    };

    socket.onclose = (event) => {
      terminal.writeln(\`\\r\\n🔌 Connection closed (code: \${event.code})\`);
      if (event.code === 1006) {
        terminal.writeln('⚠️  Abnormal closure - server may be unreachable');
      }
    };

    terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data }));
      }
    });

    window.addEventListener('beforeunload', () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    });
  </script>
</body>
</html>`;
}

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
  
  // Serve terminal HTML page
  if (url.pathname === '/terminal.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getTerminalHTML());
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
  
  // Checkout branch endpoint (pre-checkout before terminal opens)
  if (url.pathname === '/checkout-branch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { branch } = JSON.parse(body);
        
        if (!branch) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'branch required' }));
          return;
        }
        
        console.log(`📥 Pre-checkout branch: ${branch}`);
        
        // Execute git commands directly
        execSync(`cd ${REPO_PATH} && git fetch origin`, { encoding: 'utf8' });
        execSync(`cd ${REPO_PATH} && git checkout ${branch}`, { encoding: 'utf8' });
        
        console.log(`✓ Branch ${branch} checked out`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: `Branch ${branch} ready`,
          branch
        }));
      } catch (error) {
        console.error('❌ Checkout failed:', error.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: error.message 
        }));
      }
    });
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
      const startTime = Date.now();
      const timings = {};
      
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
        console.log(`⏱️  Start time: ${new Date().toISOString()}`);
        
        // Checkout branch (reset tracked files only, keep untracked)
        const gitStartTime = Date.now();
        try {
          console.log('📥 Resetting tracked files...');
          execSync(`cd ${REPO_PATH} && git reset --hard`, { encoding: 'utf8' });
          console.log('📥 Fetching and checking out branch...');
          const gitCheckout = execSync(`cd ${REPO_PATH} && git fetch origin && git checkout ${branch}`, { encoding: 'utf8' });
          console.log(gitCheckout);
          timings.gitCheckout = Date.now() - gitStartTime;
          console.log(`⏱️  Git checkout: ${timings.gitCheckout}ms`);
        } catch (gitError) {
          console.error('❌ Git checkout failed:', gitError.message);
          throw new Error(`Failed to checkout branch: ${gitError.message}`);
        }
        
        // Send task to Kiro with explicit instructions
        const promptStartTime = Date.now();
        console.log('🤖 Sending task to Kiro CLI...');
        console.log('📝 Task:', taskDescription);
        
        // Format prompt to ask Kiro to output completion signal
        const prompt = `Please implement the following task:

${taskDescription}

IMPORTANT: When you're completely finished with all changes, output exactly this line:
[KIRO_COMPLETE]

This signals that the task is done.`;
        
        timings.promptSend = Date.now() - promptStartTime;
        console.log('✅ Prompt prepared, launching non-interactive Kiro run');

        console.log('⏳ Waiting for Kiro to complete (max 10 minutes)...');

        const kiroStartTime = Date.now();
        const { success: kiroSuccess, timedOut, output: kiroOutput = '', exitCode } =
          await runNonInteractiveKiro(prompt, { timeoutMs: 600000 });
        timings.kiroExecution = Date.now() - kiroStartTime;
        const elapsedTime = Math.round(timings.kiroExecution / 1000);

        if (kiroSuccess) {
          console.log(`✅ Kiro completed in ${elapsedTime} seconds`);
        } else if (timedOut) {
          console.log(`⏰ Timeout after ${elapsedTime} seconds - Kiro may still be working`);
        } else {
          console.log(`⚠️  Kiro exited early (code: ${exitCode}) after ${elapsedTime} seconds`);
        }

        console.log(`⏱️  Kiro execution: ${timings.kiroExecution}ms`);
        console.log('📊 Kiro output length:', kiroOutput.length, 'characters');
        console.log('📊 Last 500 chars:', kiroOutput.substring(Math.max(0, kiroOutput.length - 500)));
        
        // Check if any files changed
        const gitStatusStartTime = Date.now();
        console.log('🔍 Checking for file changes...');
        const gitStatus = execSync(`cd ${REPO_PATH} && git status --porcelain`, { encoding: 'utf8' });
        console.log('📊 Git status:', gitStatus || '(no changes)');
        timings.gitStatus = Date.now() - gitStatusStartTime;
        console.log(`⏱️  Git status check: ${timings.gitStatus}ms`);
        
        if (!gitStatus || gitStatus.trim() === '') {
          console.log('ℹ️  No file changes detected - feature may already be implemented');
          timings.total = Date.now() - startTime;
          console.log(`⏱️  TOTAL TIME: ${timings.total}ms (${Math.round(timings.total/1000)}s)`);
          console.log('📊 Timing breakdown:', JSON.stringify(timings, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'No changes needed - feature already implemented',
            branch,
            kiroOutput: kiroOutput.substring(kiroOutput.length - 2000),
            noChanges: true,
            timings
          }));
          return;
        }
        
        // Commit and push
        const gitPushStartTime = Date.now();
        let gitOutput = '';
        try {
          const commitMsg = `feat: ${taskDescription.substring(0, 50)}`.replace(/"/g, '\\"');
          gitOutput = execSync(`cd ${REPO_PATH} && git add . && git commit -m "${commitMsg}" && git push origin ${branch}`, { encoding: 'utf8' });
          
          timings.gitPush = Date.now() - gitPushStartTime;
          timings.total = Date.now() - startTime;
          console.log(`⏱️  Git commit/push: ${timings.gitPush}ms`);
          console.log(`⏱️  TOTAL TIME: ${timings.total}ms (${Math.round(timings.total/1000)}s)`);
          console.log('📊 Timing breakdown:', JSON.stringify(timings, null, 2));
          
          console.log(`✅ Code generated and pushed to ${branch}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Code generated successfully',
            branch,
            kiroOutput: kiroOutput.substring(kiroOutput.length - 2000), // Last 2000 chars
            gitOutput,
            timings
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
