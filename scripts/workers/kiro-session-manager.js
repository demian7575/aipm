#!/usr/bin/env node
// Kiro Session Manager - Maintains 3 persistent Kiro sessions (2 workers + 1 monitor)

import pty from 'node-pty';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const QUEUE_TABLE = 'aipm-backend-dev-kiro-queue';
const REPO_PATH = '/home/ec2-user/aipm';

console.log('🚀 Starting Kiro Session Manager...');
console.log('📊 3 persistent sessions: 2 workers + 1 monitor');

// Session state
const sessions = {
  worker1: { pty: null, busy: false, lastActivity: Date.now(), output: '' },
  worker2: { pty: null, busy: false, lastActivity: Date.now(), output: '' },
  monitor: { pty: null, lastActivity: Date.now() }
};

// Start persistent Kiro sessions
function startSession(name) {
  console.log(`🔧 Starting ${name} session...`);
  
  const session = pty.spawn('bash', ['-c', `cd ${REPO_PATH} && cat scripts/utilities/load-context.sh | bash && kiro-cli chat`], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: REPO_PATH,
    env: process.env
  });
  
  sessions[name].pty = session;
  sessions[name].lastActivity = Date.now();
  
  session.onData((data) => {
    sessions[name].lastActivity = Date.now();
    if (name.startsWith('worker')) {
      sessions[name].output += data;
    }
  });
  
  session.onExit(() => {
    console.log(`❌ ${name} exited, restarting...`);
    setTimeout(() => startSession(name), 5000);
  });
  
  console.log(`✅ ${name} started (PID: ${session.pid})`);
}

// Send prompt to worker and wait for JSON response
async function askWorker(workerName, prompt, timeoutMs = 120000) {
  const worker = sessions[workerName];
  
  return new Promise((resolve, reject) => {
    worker.output = ''; // Clear previous output
    worker.busy = true;
    
    const timeout = setTimeout(() => {
      worker.busy = false;
      reject(new Error('Worker timeout'));
    }, timeoutMs);
    
    // Check for JSON response periodically
    const checkInterval = setInterval(() => {
      // Try to find JSON in output
      const jsonMatch = worker.output.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        worker.busy = false;
        
        try {
          const json = JSON.parse(jsonMatch[0]);
          // Validate it has expected fields
          if (json.title || json.summary || json.warnings) {
            resolve(json);
          } else {
            // Keep looking for better JSON
            return;
          }
        } catch (e) {
          // Invalid JSON, keep looking
          console.log(`⚠️  ${workerName} found invalid JSON, continuing...`);
        }
      }
      
      // If output is getting large (>50KB), we might have the response
      if (worker.output.length > 50000) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        worker.busy = false;
        
        // Try harder to extract JSON
        const lines = worker.output.split('\n');
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.title || json.summary) {
              resolve(json);
              return;
            }
          } catch (e) {
            // Not JSON, continue
          }
        }
        
        reject(new Error('No valid JSON found in large output'));
      }
    }, 1000);
    
    // Send prompt
    worker.pty.write(prompt + '\n');
  });
}

// Get pending requests from queue
async function getPendingRequests() {
  const result = await docClient.send(new QueryCommand({
    TableName: QUEUE_TABLE,
    IndexName: 'status-index',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'pending' },
    Limit: 2 // Get 2 requests (one per worker)
  }));
  
  return result.Items || [];
}

// Mark request as processing
async function markProcessing(requestId) {
  await docClient.send(new UpdateCommand({
    TableName: QUEUE_TABLE,
    Key: { requestId },
    UpdateExpression: 'SET #status = :status, processingAt = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'processing',
      ':now': new Date().toISOString()
    }
  }));
}

// Process request with available worker
async function processRequest(request, workerName) {
  const { requestId, type, payload } = request;
  
  console.log(`\n🔨 ${workerName} processing ${type}: ${requestId}`);
  
  try {
    await markProcessing(requestId);
    
    let prompt;
    if (type === 'generate-story') {
      const { idea, parentStory } = payload;
      prompt = `Generate a high-quality user story following INVEST principles.

Idea: "${idea}"
${parentStory ? `Parent: "${parentStory.title}"` : ''}

Respond ONLY with valid JSON:
{"title":"...","asA":"...","iWant":"...","soThat":"...","storyPoint":3,"components":["..."],"acceptanceCriteria":["..."]}`;
    }
    
    const result = await askWorker(workerName, prompt);
    
    // POST result back to Lambda
    const response = await fetch(payload.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, result })
    });
    
    if (!response.ok) {
      throw new Error(`Callback failed: ${response.status}`);
    }
    
    console.log(`✅ ${workerName} completed ${requestId}`);
    
  } catch (error) {
    console.error(`❌ ${workerName} failed ${requestId}:`, error.message);
    
    // POST error back
    try {
      await fetch(payload.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, error: error.message })
      });
    } catch (e) {
      console.error('Failed to send error callback:', e.message);
    }
  }
}

// Monitor worker health
function monitorWorkers() {
  const now = Date.now();
  
  ['worker1', 'worker2'].forEach(name => {
    const worker = sessions[name];
    const idle = now - worker.lastActivity;
    
    if (idle > 300000) { // 5 minutes no activity
      console.log(`⚠️  ${name} idle for ${Math.round(idle/1000)}s, restarting...`);
      worker.pty.kill();
    }
  });
}

// Main polling loop
async function poll() {
  try {
    const pending = await getPendingRequests();
    
    if (pending.length > 0) {
      console.log(`📥 Found ${pending.length} pending request(s)`);
      
      // Assign to available workers
      const workers = ['worker1', 'worker2'].filter(name => !sessions[name].busy);
      
      for (let i = 0; i < Math.min(pending.length, workers.length); i++) {
        processRequest(pending[i], workers[i]); // Don't await - process in parallel
      }
    }
  } catch (error) {
    console.error('Poll error:', error.message);
  }
  
  setTimeout(poll, 5000); // Poll every 5 seconds
}

// Start everything
console.log('⏳ Initializing sessions (this takes ~30 seconds)...');
startSession('worker1');
startSession('worker2');
startSession('monitor');

// Wait for sessions to initialize
setTimeout(() => {
  console.log('✅ All sessions ready, starting queue polling...');
  poll();
  
  // Monitor health every minute
  setInterval(monitorWorkers, 60000);
}, 30000);
