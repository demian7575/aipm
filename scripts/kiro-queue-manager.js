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
    this.responseTimeout = null;
  }

  async start() {
    if (this.kiroProcess) return;
    
    console.log('🚀 Starting persistent Kiro CLI session...');
    
    // Use kiro-cli from PATH in production, specific paths in development
    const kiroPath = process.env.NODE_ENV === 'production' 
      ? 'kiro-cli' 
      : (process.env.USER === 'ec2-user' ? '/home/ec2-user/.local/bin/kiro-cli' : '/home/ebaejun/.local/bin/kiro-cli');
    const workingDir = process.env.NODE_ENV === 'production' ? '/app' : '/home/ec2-user/aipm';
    
    this.kiroProcess = spawn(kiroPath, ['chat', '--trust-all-tools'], {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.kiroProcess.stdout.on('data', (data) => {
      this.buffer += data.toString();
      this.checkForResponse();
    });

    this.kiroProcess.stderr.on('data', (data) => {
      console.error('Kiro stderr:', data.toString());
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
      // Wait a bit more to ensure we got the full response
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
      }, 500); // Wait 500ms after seeing prompt to ensure complete response
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

    console.log(`📤 Sending to Kiro: ${message.substring(0, 50)}...`);
    this.kiroProcess.stdin.write(message + '\n');

    // Timeout after 60 seconds
    setTimeout(() => {
      if (this.currentResolver) {
        this.currentResolver({
          success: false,
          output: this.buffer.trim(),
          error: 'Timeout after 60s'
        });
        this.currentResolver = null;
        this.buffer = '';
        this.processNext();
      }
    }, 60000);
  }
}

export default KiroQueueManager;
