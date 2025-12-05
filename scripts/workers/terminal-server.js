#!/usr/bin/env node
// Terminal server for EC2 - handles Kiro CLI WebSocket connections + HTTP API

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import pty from 'node-pty';
import { execSync, spawn } from 'node:child_process';

const PORT = process.env.PORT || 8080;
const REPO_PATH = process.env.REPO_PATH || '/home/ec2-user/aipm';

// 2 Persistent Kiro Worker Sessions
const workers = {
  worker1: { 
    pty: null, 
    busy: false, 
    lastActivity: Date.now(), 
    output: '', 
    queue: [],
    taskStartTime: null,
    lastProgressTime: null,
    currentTask: null,
    consecutiveFailures: 0
  },
  worker2: { 
    pty: null, 
    busy: false, 
    lastActivity: Date.now(), 
    output: '', 
    queue: [],
    taskStartTime: null,
    lastProgressTime: null,
    currentTask: null,
    consecutiveFailures: 0
  }
};

// Start persistent Kiro worker
function startWorker(name) {
  console.log(`🚀 Starting ${name}...`);
  const pty_session = pty.spawn('bash', ['-c', `cd ${REPO_PATH} && cat scripts/utilities/load-context.sh | bash && kiro-cli chat`], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: REPO_PATH,
    env: process.env
  });
  
  workers[name].pty = pty_session;
  workers[name].lastActivity = Date.now();
  console.log(`✅ ${name} started (PID: ${pty_session.pid})`);
  
  pty_session.onData((data) => {
    workers[name].lastActivity = Date.now();
    workers[name].output += data;
    
    // Track progress signals
    if (data.includes('[KIRO_PROGRESS]') || 
        data.includes('Analyzing') ||
        data.includes('Generating') ||
        data.includes('Testing') ||
        data.includes('Creating') ||
        data.includes('Updating')) {
      workers[name].lastProgressTime = Date.now();
    }
    
    // Broadcast to WebSocket clients
    clients.forEach(client => {
      try {
        sendWSMessage(client.socket, { type: 'output', data, worker: name });
      } catch (e) {
        clients.delete(client);
      }
    });
  });
  
  pty_session.onExit(({ exitCode }) => {
    console.error(`❌ ${name} exited (code: ${exitCode}), restarting in 5s...`);
    setTimeout(() => startWorker(name), 5000);
  });
}

// Get available worker (round-robin)
let lastWorker = 'worker2';
function getAvailableWorker() {
  const next = lastWorker === 'worker1' ? 'worker2' : 'worker1';
  lastWorker = next;
  
  if (!workers[next].busy) return next;
  
  const other = next === 'worker1' ? 'worker2' : 'worker1';
  if (!workers[other].busy) return other;
  
  return null; // Both busy
}

// Send prompt to worker and wait for JSON response
async function askWorker(workerName, prompt, timeoutMs = 120000) {
  const worker = workers[workerName];
  
  return new Promise((resolve, reject) => {
    worker.output = '';
    worker.busy = true;
    
    const timeout = setTimeout(() => {
      worker.busy = false;
      reject(new Error(`${workerName} timeout`));
    }, timeoutMs);
    
    const checkInterval = setInterval(() => {
      const jsonMatch = worker.output.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const json = JSON.parse(jsonMatch[0]);
          if (json.title || json.summary || json.warnings) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            worker.busy = false;
            resolve(json);
          }
        } catch (e) {
          // Invalid JSON, keep looking
        }
      }
    }, 1000);
    
    worker.pty.write(prompt + '\n');
  });
}

// Manager: Monitor worker health
function monitorWorkers() {
  const now = Date.now();
  
  Object.entries(workers).forEach(([name, worker]) => {
    const idle = now - worker.lastActivity;
    const taskDuration = worker.taskStartTime ? now - worker.taskStartTime : 0;
    const timeSinceProgress = worker.lastProgressTime ? now - worker.lastProgressTime : 0;
    
    // Check 1: Idle too long (not busy)
    if (!worker.busy && idle > 300000) { // 5 min idle
      console.log(`⚠️  ${name} idle ${Math.round(idle/1000)}s, restarting...`);
      worker.pty.kill();
      return;
    }
    
    // Check 2: Task taking too long
    if (worker.busy && taskDuration > 900000) { // 15 min max per task
      console.log(`⚠️  ${name} task timeout (${Math.round(taskDuration/1000)}s), killing...`);
      worker.pty.kill();
      worker.busy = false;
      worker.taskStartTime = null;
      worker.currentTask = null;
      worker.consecutiveFailures++;
      return;
    }
    
    // Check 3: No progress for too long
    if (worker.busy && worker.lastProgressTime && timeSinceProgress > 300000) { // 5 min no progress
      console.log(`⚠️  ${name} no progress for ${Math.round(timeSinceProgress/1000)}s, killing...`);
      worker.pty.kill();
      worker.busy = false;
      worker.taskStartTime = null;
      worker.currentTask = null;
      worker.consecutiveFailures++;
      return;
    }
    
    // Check 4: Too many consecutive failures
    if (worker.consecutiveFailures >= 3) {
      console.log(`🚨 ${name} has ${worker.consecutiveFailures} consecutive failures - needs attention!`);
    }
    
    // Log status
    const status = worker.busy ? 'BUSY' : 'IDLE';
    const task = worker.currentTask ? `PR#${worker.currentTask.prNumber}` : 'none';
    const failures = worker.consecutiveFailures > 0 ? `, failures: ${worker.consecutiveFailures}` : '';
    
    console.log(`📊 ${name}: ${status}, task: ${task}, ` +
                `activity: ${Math.round(idle/1000)}s ago` +
                (worker.busy ? `, duration: ${Math.round(taskDuration/1000)}s` : '') +
                failures);
  });
}

// Initialize workers
console.log('🚀 Starting 2 persistent Kiro workers...');
startWorker('worker1');
startWorker('worker2');

// Start health monitor
setInterval(monitorWorkers, 60000); // Check every minute

async function runNonInteractiveKiro(prompt, { timeoutMs = 600000, workerName = null } = {}) {
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

    const handleData = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
      
      // Update worker activity to prevent idle timeout
      if (workerName && workers[workerName]) {
        workers[workerName].lastActivity = Date.now();
        workers[workerName].lastProgressTime = Date.now();
      }

      if (text.includes('Allow this action?') || text.includes('[y/n/t]')) {
        console.log('🔔 Permission prompt detected (non-interactive), sending trust (t)...');
        kiroProcess.stdin.write('t\n');
      }

      // Detect completion signals
      if (text.includes('[KIRO_COMPLETE]') || 
          text.includes('completed successfully') ||
          text.includes('All changes have been made') || 
          text.includes('Is there anything else') ||
          text.includes('Implementation complete') ||
          text.includes('✓ Implementation complete') ||
          (text.includes('Done.') && text.includes('▸ Time:')) ||
          (text.includes('✅') && text.includes('▸ Time:')) ||
          (text.includes('✓') && text.includes('▸ Time:'))) {
        finish({ success: true });
      }
    };

    kiroProcess.stdout.on('data', handleData);
    kiroProcess.stderr.on('data', handleData);

    kiroProcess.on('exit', (code) => {
      if (!finished) {
        finish({ success: false, exitCode: code });
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
    const now = Date.now();
    const health = {};
    
    Object.entries(workers).forEach(([name, worker]) => {
      health[name] = {
        status: worker.busy ? 'busy' : 'idle',
        pid: worker.pty?.pid,
        lastActivity: worker.lastActivity,
        idleTime: now - worker.lastActivity,
        currentTask: worker.currentTask,
        taskDuration: worker.taskStartTime ? now - worker.taskStartTime : 0,
        timeSinceProgress: worker.lastProgressTime ? now - worker.lastProgressTime : 0,
        consecutiveFailures: worker.consecutiveFailures,
        healthy: worker.consecutiveFailures < 3
      };
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      timestamp: now,
      workers: health
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
  
  // Kiro API endpoints for Lambda - use worker pool
  if (url.pathname.startsWith('/kiro/') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const endpoint = url.pathname.substring(6);
        
        console.log(`🤖 Kiro API request: ${endpoint}`);
        
        // Get available worker
        const workerName = getAvailableWorker();
        if (!workerName) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'All workers busy, try again' }));
          return;
        }
        
        console.log(`📍 Assigned to ${workerName}`);
        
        let prompt, result;
        
        if (endpoint === 'generate-story') {
          const { idea, parentStory } = payload;
          prompt = `Generate a high-quality user story following INVEST principles.

Idea: "${idea}"
${parentStory ? `Parent Story: "${parentStory.title}"` : ''}

Respond ONLY with valid JSON:
{
  "title": "...",
  "asA": "...",
  "iWant": "...",
  "soThat": "...",
  "storyPoint": 3,
  "components": ["..."],
  "acceptanceCriteria": ["...", "...", "..."]
}`;
          
          result = await askWorker(workerName, prompt);
          
        } else if (endpoint === 'generate-test') {
          const { story } = payload;
          prompt = `Generate acceptance test for: ${story.title}

Respond ONLY with valid JSON:
{
  "title": "Test title",
  "given": ["precondition 1"],
  "when": ["action 1"],
  "then": ["expected result 1", "expected result 2"]
}`;
          
          result = await askWorker(workerName, prompt);
          
        } else if (endpoint === 'analyze-invest') {
          const { story } = payload;
          prompt = `Analyze INVEST compliance for: ${story.title}

Respond ONLY with valid JSON:
{
  "summary": "Overall assessment",
  "warnings": [{"criterion": "...", "message": "...", "suggestion": "..."}]
}`;
          
          result = await askWorker(workerName, prompt);
          
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unknown endpoint' }));
          return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        
      } catch (error) {
        console.error('❌ Kiro API error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
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
        
        // Track task start (for health monitoring)
        const workerForTracking = Object.values(workers).find(w => !w.busy);
        if (workerForTracking) {
          workerForTracking.busy = true;
          workerForTracking.taskStartTime = Date.now();
          workerForTracking.lastProgressTime = Date.now();
          workerForTracking.lastActivity = Date.now();
          workerForTracking.currentTask = { branch, prNumber };
        }
        
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
          await runNonInteractiveKiro(prompt, { timeoutMs: 600000, workerName: workerForTracking ? Object.keys(workers).find(k => workers[k] === workerForTracking) : null });
        timings.kiroExecution = Date.now() - kiroStartTime;
        const elapsedTime = Math.round(timings.kiroExecution / 1000);
        
        // Clear worker tracking
        if (workerForTracking) {
          workerForTracking.busy = false;
          workerForTracking.taskStartTime = null;
          workerForTracking.currentTask = null;
        }

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
          gitOutput = execSync(`cd ${REPO_PATH} && git add . && git commit -m "feat: ${taskDescription.substring(0, 50)}" && git push origin ${branch}`, { encoding: 'utf8' });
          
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
  
  // Kiro AI endpoints
  if (url.pathname === '/kiro/generate-story' && req.method === 'POST') {
    const { generateStoryWithKiro } = await import('./kiro-api-endpoints.js');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      req.body = JSON.parse(body);
      await generateStoryWithKiro(req, res);
    });
    return;
  }
  
  if (url.pathname === '/kiro/generate-test' && req.method === 'POST') {
    const { generateAcceptanceTestWithKiro } = await import('./kiro-api-endpoints.js');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      req.body = JSON.parse(body);
      await generateAcceptanceTestWithKiro(req, res);
    });
    return;
  }
  
  if (url.pathname === '/kiro/analyze-invest' && req.method === 'POST') {
    const { analyzeInvestWithKiro } = await import('./kiro-api-endpoints.js');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      req.body = JSON.parse(body);
      await analyzeInvestWithKiro(req, res);
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
          // Text or binary frame - send to first available worker
          try {
            const message = JSON.parse(frame.payload.toString());
            if (message.type === 'input') {
              const workerName = getAvailableWorker() || 'worker1';
              workers[workerName].pty.write(message.data);
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
  console.log(`👷 2 persistent workers + health monitor`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}/terminal?branch=<branch-name>`);
  console.log(`🔗 Code generation: POST http://localhost:${PORT}/generate-code`);
});
