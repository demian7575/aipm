#!/usr/bin/env node

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class KiroQueueManager extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
    this.kiroProcess = null;
    this.currentResolver = null;
    this.buffer = '';
    this.lineBuffer = ''; // Buffer for line-by-line output
    this.stderrLineBuffer = ''; // Buffer for stderr line-by-line output
    this.responseTimeout = null;
    this.logBroadcaster = null; // Will be set by API server
  }
  
  setLogBroadcaster(broadcaster) {
    this.logBroadcaster = broadcaster;
  }
  
  broadcastLog(message) {
    if (this.logBroadcaster) {
      // Filter out binary data and control characters
      const cleanMessage = message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim();
      if (cleanMessage && cleanMessage.length > 0) {
        this.logBroadcaster(cleanMessage);
      }
    }
  }

  async start() {
    if (this.kiroProcess) return;
    
    console.log('🚀 Starting persistent Kiro CLI session...');
    
    // Determine Kiro CLI path and working directory
    const kiroPath = process.env.KIRO_CLI_PATH || 'kiro-cli';
    const workingDir = process.env.KIRO_WORKING_DIR || process.cwd();
    
    console.log(`   Kiro CLI: ${kiroPath}`);
    console.log(`   Working dir: ${workingDir}`);
    
    this.kiroProcess = spawn(kiroPath, ['chat', '--trust-all-tools'], {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.kiroProcess.stdout.on('data', (data) => {
      const text = data.toString();
      this.buffer += text;
      this.lineBuffer += text;
      
      // Broadcast complete lines only
      const lines = this.lineBuffer.split('\n');
      if (lines.length > 1) {
        // Broadcast all complete lines (all but the last incomplete one)
        for (let i = 0; i < lines.length - 1; i++) {
          const clean = lines[i].replace(/\x1b\[[0-9;]*[mGKHJ]/g, '').trim();
          if (clean) {
            this.broadcastLog(`[Kiro stdout] ${clean}`);
          }
        }
        // Keep the last incomplete line in buffer
        this.lineBuffer = lines[lines.length - 1];
      }
      
      this.checkForResponse();
    });

    this.kiroProcess.stderr.on('data', (data) => {
      const text = data.toString();
      this.stderrLineBuffer += text;
      
      // Broadcast complete lines only
      const lines = this.stderrLineBuffer.split('\n');
      if (lines.length > 1) {
        for (let i = 0; i < lines.length - 1; i++) {
          const clean = lines[i].replace(/\x1b\[[0-9;]*[mGKHJ]/g, '').trim();
          if (clean && !clean.match(/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]\s*Thinking/)) {
            this.broadcastLog(`[Kiro stderr] ${clean}`);
          }
        }
        this.stderrLineBuffer = lines[lines.length - 1];
      }
      console.error('Kiro stderr:', text);
    });

    this.kiroProcess.on('close', () => {
      console.log('Kiro process closed, restarting...');
      this.kiroProcess = null;
      setTimeout(() => this.start(), 1000);
    });

    // Wait for Kiro to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  checkForResponse() {
    // Look for multiple completion indicators
    const hasPromptMarker = this.buffer.includes('\x1b[38;5;141m> \x1b[0m');
    const hasTimeMarker = this.buffer.includes('▸ Time:');
    const hasExitMessage = this.buffer.includes('To exit the CLI');
    
    // More aggressive completion detection
    const isComplete = hasPromptMarker || (hasTimeMarker && hasExitMessage);
    
    if (isComplete && this.currentResolver) {
      // Immediate response without waiting
      if (this.responseTimeout) clearTimeout(this.responseTimeout);
      
      const cleanBuffer = this.buffer.replace(/\x1b\[[0-9;]*[mGKHJ]/g, '').trim();
      
      // Extract response, removing markers - don't cut at Time marker
      let response = cleanBuffer
        .split('To exit the CLI')[0]  // Only cut at exit message
        .replace(/^>\s*/, '')
        .trim();
      
      // If response is too short, wait a bit more
      if (response.length < 10 && !hasTimeMarker) {
        this.responseTimeout = setTimeout(() => {
          this.completeResponse();
        }, 2000); // Wait only 2 seconds
        return;
      }
      
      this.completeResponse();
    }
  }
  
  completeResponse() {
    if (!this.currentResolver) return;
    
    const cleanBuffer = this.buffer.replace(/\x1b\[[0-9;]*[mGKHJ]/g, '').trim();
    
    // Don't cut off at "▸ Time:" - the JSON comes before it
    let response = cleanBuffer
      .split('To exit the CLI')[0]  // Only cut at exit message
      .replace(/^>\s*/, '')  // Remove "> " prompt
      .trim();
    
    this.currentResolver({
      success: true,
      output: response,
      error: ''
    });
    this.currentResolver = null;
    this.buffer = '';
    this.responseTimeout = null;
    this.processNext();
  }

  async sendCommand(message) {
    return new Promise((resolve) => {
      const timestamp = new Date().toISOString();
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const caller = this.getCallerInfo();
      
      // Log queue addition with detailed info
      this.broadcastLog(`📥 QUEUE ADD [${requestId}] at ${timestamp}`);
      this.broadcastLog(`   Caller: ${caller}`);
      this.broadcastLog(`   Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
      this.broadcastLog(`   Queue size before: ${this.queue.length}`);
      
      this.queue.push({ message, resolve, requestId, timestamp, caller });
      
      this.broadcastLog(`   Queue size after: ${this.queue.length}`);
      
      if (!this.processing) {
        this.processNext();
      }
    });
  }

  getCallerInfo() {
    const stack = new Error().stack;
    const lines = stack.split('\n');
    // Find the first line that's not from this file
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (line && !line.includes('kiro-queue-manager.js')) {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          const [, func, file, lineNum] = match;
          const fileName = file.split('/').pop();
          return `${func} (${fileName}:${lineNum})`;
        }
      }
    }
    return 'unknown';
  }

  processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      this.broadcastLog(`📤 QUEUE EMPTY - Processing stopped`);
      return;
    }

    this.processing = true;
    const item = this.queue.shift();
    const { message, resolve, requestId, timestamp, caller } = item;
    
    // Log queue processing with detailed info
    this.broadcastLog(`🔄 QUEUE PROCESS [${requestId || 'unknown'}] started`);
    this.broadcastLog(`   Added at: ${timestamp || 'unknown'}`);
    this.broadcastLog(`   Caller: ${caller || 'unknown'}`);
    this.broadcastLog(`   Remaining in queue: ${this.queue.length}`);
    
    this.currentResolver = resolve;
    this.currentRequestId = requestId;
    this.buffer = '';
    this.lineBuffer = ''; // Clear line buffer for new command
    this.stderrLineBuffer = ''; // Clear stderr line buffer

    console.log(`📤 Sending to Kiro: ${message.substring(0, 50)}...`);
    console.log(`\n${'='.repeat(80)}`);
    console.log('EXACT MESSAGE SENT TO KIRO CLI:');
    console.log(`${'='.repeat(80)}`);
    console.log(message);
    console.log(`${'='.repeat(80)}\n`);
    this.broadcastLog(`📤 Sending to Kiro CLI...`);
    this.kiroProcess.stdin.write(message + '\n');

    // Timeout after 15 minutes
    setTimeout(() => {
      if (this.currentResolver) {
        this.broadcastLog(`⏱️ TIMEOUT [${this.currentRequestId || 'unknown'}] after 15 minutes`);
        this.currentResolver({
          success: false,
          output: this.buffer.trim(),
          error: 'Timeout after 15 minutes'
        });
        this.currentResolver = null;
        this.currentRequestId = null;
        this.buffer = '';
        this.lineBuffer = '';
        this.stderrLineBuffer = '';
        this.processNext();
      }
    }, 900000); // 15 minutes
  }
}

export default KiroQueueManager;
