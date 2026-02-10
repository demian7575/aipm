#!/usr/bin/env node

/**
 * Kiro CLI Session Pool Server V2
 * 
 * Improvements:
 * 1. Systemd-managed Kiro processes (no internal spawn/kill)
 * 2. Multi-signal abnormality detection
 * 3. Simplified session lifecycle
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createWriteStream, existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import http from 'http';
import net from 'net';

const execAsync = promisify(exec);

const POOL_SIZE = 2;
const LOG_FILE = '/tmp/kiro-session-pool.log';
const LOCK_FILE = '/tmp/kiro-session-pool.lock';
const PID_FILE = '/tmp/kiro-session-pool.pid';
const ABNORMALITY_CHECK_INTERVAL = 10000; // Check every 10 seconds

// Abnormality detection thresholds
const DETECTION_CONFIG = {
  noOutput: { weight: 0.4, threshold: 30000 },      // 30s no output
  lowCpu: { weight: 0.3, threshold: 1 },            // CPU < 1% while busy
  highMemory: { weight: 0.2, threshold: 500 },      // Memory > 500MB
  longRunning: { weight: 0.1, threshold: 600000 }   // > 10 minutes
};
const ABNORMALITY_THRESHOLD = 0.5; // Trigger if score >= 0.5

// Lock file management
function checkExistingInstance() {
  if (existsSync(LOCK_FILE)) {
    try {
      const oldPid = parseInt(readFileSync(PID_FILE, 'utf8').trim());
      try {
        process.kill(oldPid, 0);
        console.error(`❌ Session pool already running (PID: ${oldPid})`);
        process.exit(1);
      } catch (e) {
        console.log('⚠️  Stale lock file, cleaning up...');
        unlinkSync(LOCK_FILE);
        unlinkSync(PID_FILE);
      }
    } catch (e) {
      try { unlinkSync(LOCK_FILE); } catch {}
      try { unlinkSync(PID_FILE); } catch {}
    }
  }
}

function createLockFile() {
  writeFileSync(PID_FILE, process.pid.toString());
  writeFileSync(LOCK_FILE, new Date().toISOString());
}

function removeLockFile() {
  try {
    unlinkSync(LOCK_FILE);
    unlinkSync(PID_FILE);
  } catch (e) {}
}

// Get process resources
async function getProcessResources(pid) {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o %cpu,%mem,rss --no-headers`);
    const [cpu, mem, rss] = stdout.trim().split(/\s+/);
    return {
      cpu: parseFloat(cpu),
      memPercent: parseFloat(mem),
      memMB: parseInt(rss) / 1024
    };
  } catch (e) {
    return null;
  }
}

// Abnormality detector
class AbnormalityDetector {
  constructor(session) {
    this.session = session;
  }
  
  async calculateScore() {
    let score = 0;
    const now = Date.now();
    
    // Signal 1: No output timeout
    if (this.session.lastOutputTime) {
      const silentTime = now - this.session.lastOutputTime;
      if (silentTime > DETECTION_CONFIG.noOutput.threshold) {
        score += DETECTION_CONFIG.noOutput.weight;
        this.session.log(`  [Detector] No output for ${Math.round(silentTime/1000)}s (+${DETECTION_CONFIG.noOutput.weight})`);
      }
    }
    
    // Signal 2: CPU activity
    const socketPath = `/tmp/kiro-session-${this.session.id}.sock`;
    if (existsSync(socketPath)) {
      const pid = await this.getSessionPid();
      if (pid && this.session.busy) {
        const resources = await getProcessResources(pid);
        if (resources) {
          if (resources.cpu < DETECTION_CONFIG.lowCpu.threshold) {
            score += DETECTION_CONFIG.lowCpu.weight;
            this.session.log(`  [Detector] Low CPU ${resources.cpu}% (+${DETECTION_CONFIG.lowCpu.weight})`);
          }
          
          // Signal 3: Memory leak
          if (resources.memMB > DETECTION_CONFIG.highMemory.threshold) {
            score += DETECTION_CONFIG.highMemory.weight;
            this.session.log(`  [Detector] High memory ${Math.round(resources.memMB)}MB (+${DETECTION_CONFIG.highMemory.weight})`);
          }
        }
      }
    }
    
    // Signal 4: Execution time
    if (this.session.executionStartTime) {
      const runTime = now - this.session.executionStartTime;
      if (runTime > DETECTION_CONFIG.longRunning.threshold) {
        score += DETECTION_CONFIG.longRunning.weight;
        this.session.log(`  [Detector] Long running ${Math.round(runTime/1000)}s (+${DETECTION_CONFIG.longRunning.weight})`);
      }
    }
    
    return score;
  }
  
  async getSessionPid() {
    try {
      const { stdout } = await execAsync(`systemctl show kiro-session@${this.session.id}.service -p MainPID --value`);
      const pid = parseInt(stdout.trim());
      return pid > 0 ? pid : null;
    } catch (e) {
      return null;
    }
  }
  
  async isAbnormal() {
    const score = await this.calculateScore();
    
    if (score >= ABNORMALITY_THRESHOLD) {
      this.session.log(`⚠️ Abnormality detected (score: ${score.toFixed(2)} >= ${ABNORMALITY_THRESHOLD})`);
      return true;
    }
    
    return false;
  }
}

// Session class
class KiroSession {
  constructor(id, logStream) {
    this.id = id;
    this.logStream = logStream;
    this.busy = false;
    this.lastOutputTime = null;
    this.executionStartTime = null;
    this.lastUsed = Date.now();
    this.socketPath = `/tmp/kiro-session-${id}.sock`;
    this.socket = null;
    this.outputBuffer = '';
    this.currentResolve = null;
    this.currentReject = null;
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    this.logStream.write(`[Session-${this.id}] [${timestamp}] ${message}\n`);
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.connect(this.socketPath);
      
      this.socket.on('connect', () => {
        this.log('Connected to Kiro session');
        resolve();
      });
      
      this.socket.on('data', (data) => {
        const chunk = data.toString();
        this.outputBuffer += chunk;
        this.lastOutputTime = Date.now();
        
        // Check for completion signals
        if (chunk.includes('TASK COMPLETE') || chunk.includes('You:')) {
          this.complete();
        }
      });
      
      this.socket.on('error', (err) => {
        this.log(`Socket error: ${err.message}`);
        reject(err);
      });
      
      this.socket.on('close', () => {
        this.log('Socket closed');
        this.socket = null;
      });
    });
  }
  
  async execute(prompt, requestId = null) {
    if (this.busy) {
      throw new Error(`Session ${this.id} is busy`);
    }
    
    this.busy = true;
    this.lastUsed = Date.now();
    this.outputBuffer = '';
    this.lastOutputTime = Date.now();
    this.executionStartTime = Date.now();
    
    return new Promise(async (resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;
      
      try {
        if (!this.socket) {
          await this.connect();
        }
        
        this.log(`Executing: ${prompt.substring(0, 100)}...`);
        this.socket.write(prompt + '\n');
        
      } catch (err) {
        this.busy = false;
        reject(err);
      }
    });
  }
  
  complete() {
    if (this.currentResolve) {
      this.currentResolve(this.outputBuffer);
      this.currentResolve = null;
      this.currentReject = null;
    }
    this.busy = false;
    this.executionStartTime = null;
    this.log('Request completed');
  }
  
  async handleStuck() {
    this.log(`❌ Session stuck, restarting via systemd...`);
    
    try {
      await execAsync(`sudo systemctl restart kiro-session@${this.id}.service`);
      this.log('✅ Session restarted');
      
      // Reject current request
      if (this.currentReject) {
        this.currentReject(new Error('Session restarted due to abnormality'));
        this.currentReject = null;
        this.currentResolve = null;
      }
      
      this.busy = false;
      this.socket = null;
      
      // Wait for service to come back up
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (err) {
      this.log(`❌ Failed to restart session: ${err.message}`);
    }
  }
}

// Session pool
class KiroSessionPool {
  constructor(size, logStream) {
    this.sessions = [];
    this.queue = [];
    this.logStream = logStream;
    
    for (let i = 1; i <= size; i++) {
      this.sessions.push(new KiroSession(i, logStream));
    }
    
    this.startAbnormalityMonitoring();
  }
  
  startAbnormalityMonitoring() {
    setInterval(async () => {
      for (const session of this.sessions) {
        if (!session.busy) continue;
        
        const detector = new AbnormalityDetector(session);
        if (await detector.isAbnormal()) {
          await session.handleStuck();
        }
      }
    }, ABNORMALITY_CHECK_INTERVAL);
  }
  
  async execute(prompt, requestId = null) {
    // Find available session
    const session = this.sessions.find(s => !s.busy);
    
    if (session) {
      return await session.execute(prompt, requestId);
    }
    
    // Queue request
    this.logStream.write(`[Pool] All sessions busy, queuing (queue: ${this.queue.length + 1})\n`);
    
    return new Promise((resolve, reject) => {
      this.queue.push({ prompt, requestId, resolve, reject });
    });
  }
  
  processQueue() {
    if (this.queue.length === 0) return;
    
    const session = this.sessions.find(s => !s.busy);
    if (!session) return;
    
    const item = this.queue.shift();
    if (!item) return;
    
    session.execute(item.prompt, item.requestId)
      .then(item.resolve)
      .catch(item.reject);
  }
  
  getStatus() {
    return {
      poolSize: this.sessions.length,
      available: this.sessions.filter(s => !s.busy).length,
      busy: this.sessions.filter(s => s.busy).length,
      queueLength: this.queue.length
    };
  }
}

// Main
checkExistingInstance();
createLockFile();

const logStream = createWriteStream(LOG_FILE, { flags: 'a' });
const pool = new KiroSessionPool(POOL_SIZE, logStream);

console.log(`✅ Kiro Session Pool V2 started (PID: ${process.pid})`);
console.log(`   Pool size: ${POOL_SIZE}`);
console.log(`   Log file: ${LOG_FILE}`);

// HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', ...pool.getStatus() }));
    return;
  }
  
  if (url.pathname === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prompt, requestId } = JSON.parse(body);
        const result = await pool.execute(prompt, requestId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', result }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

server.listen(8082, () => {
  console.log('✅ HTTP server listening on port 8082');
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down...');
  removeLockFile();
  process.exit(0);
});

process.on('SIGTERM', () => {
  removeLockFile();
  process.exit(0);
});
