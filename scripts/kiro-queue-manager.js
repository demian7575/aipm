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
      this.logBroadcaster(message);
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
    // Wait for Kiro's purple prompt ("> ") as completion marker
    const hasPromptMarker = this.buffer.includes('\x1b[38;5;141m> \x1b[0m');
    
    if (hasPromptMarker && this.currentResolver) {
      // Wait 10 seconds after prompt to ensure Kiro is completely done
      if (this.responseTimeout) clearTimeout(this.responseTimeout);
      
      this.responseTimeout = setTimeout(() => {
        const cleanBuffer = this.buffer.replace(/\x1b\[[0-9;]*[mGKHJ]/g, '').trim();
        
        // Extract response, removing markers
        let response = cleanBuffer
          .split('▸ Time:')[0]
          .split('To exit the CLI')[0]
          .replace(/^>\s*/, '')
          .trim();
        
        if (this.currentResolver) {
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
      }, 10000); // Wait 10 seconds after purple prompt
    }
  }

  async sendCommand(message) {
    return new Promise((resolve) => {
      this.queue.push({ message, resolve });
      if (!this.processing) {
        this.processNext();
      }
    });
  }

  processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const { message, resolve } = this.queue.shift();
    this.currentResolver = resolve;
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
        this.broadcastLog(`⏱️ Timeout after 15 minutes`);
        this.currentResolver({
          success: false,
          output: this.buffer.trim(),
          error: 'Timeout after 15 minutes'
        });
        this.currentResolver = null;
        this.buffer = '';
        this.lineBuffer = '';
        this.stderrLineBuffer = '';
        this.processNext();
      }
    }, 900000); // 15 minutes
  }
}

export default KiroQueueManager;
