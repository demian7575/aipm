#!/usr/bin/env node
// Kiro Queue Worker - Polls DynamoDB for pending requests, processes with Kiro, POSTs results back to Lambda

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { spawn } from 'child_process';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const QUEUE_TABLE = 'aipm-backend-dev-kiro-queue';
const POLL_INTERVAL = 5000; // 5 seconds
const KIRO_TIMEOUT = 600000; // 10 minutes (Kiro initialization is very slow)

console.log('🤖 Kiro Queue Worker starting...');
console.log(`📊 Polling ${QUEUE_TABLE} every ${POLL_INTERVAL}ms`);
console.log(`⏱️  Kiro timeout: ${KIRO_TIMEOUT / 1000}s`);

async function getPendingRequests() {
  const result = await docClient.send(new QueryCommand({
    TableName: QUEUE_TABLE,
    IndexName: 'status-index',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'pending' },
    Limit: 1 // Process one at a time
  }));
  
  return result.Items || [];
}

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

async function callKiroWithPrompt(prompt) {
  return new Promise((resolve, reject) => {
    console.log('🚀 Spawning Kiro CLI...');
    const startTime = Date.now();
    const kiro = spawn('kiro-cli', ['chat'], {
      env: process.env,
      cwd: '/home/ec2-user/aipm'
    });

    let output = '';
    const timeout = setTimeout(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`⏰ Kiro timeout after ${elapsed}s`);
      console.log(`📝 Output so far (${output.length} chars):`, output.substring(0, 500));
      kiro.kill();
      reject(new Error('Kiro CLI timeout'));
    }, KIRO_TIMEOUT);

    kiro.stdout.on('data', (data) => {
      const prevLength = output.length;
      output += data.toString();
      // Log progress every 1000 chars
      if (Math.floor(output.length / 1000) > Math.floor(prevLength / 1000)) {
        console.log(`📊 Kiro output: ${output.length} chars...`);
      }
    });

    kiro.on('close', () => {
      clearTimeout(timeout);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`✅ Kiro closed after ${elapsed}s, output: ${output.length} chars`);
      try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('✅ Found JSON in output');
          resolve(JSON.parse(jsonMatch[0]));
        } else {
          console.log('❌ No JSON found in output:', output.substring(0, 500));
          reject(new Error('No valid JSON in Kiro response'));
        }
      } catch (error) {
        console.log('❌ JSON parse error:', error.message);
        reject(new Error(`Failed to parse Kiro response: ${error.message}`));
      }
    });

    kiro.stdin.write(prompt + '\n\n');
    kiro.stdin.write('/quit\n');
    kiro.stdin.end();
  });
}

async function processRequest(request) {
  const { requestId, type, payload } = request;
  
  console.log(`\n🔨 Processing ${type} request: ${requestId}`);
  
  try {
    await markProcessing(requestId);
    
    let prompt, result;
    
    if (type === 'generate-story') {
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
      
      result = await callKiroWithPrompt(prompt);
    }
    
    // POST result back to Lambda callback
    const callbackUrl = payload.callbackUrl;
    console.log(`📤 Sending result to ${callbackUrl}`);
    
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, result })
    });
    
    if (!response.ok) {
      throw new Error(`Callback failed: ${response.status}`);
    }
    
    console.log(`✅ Request ${requestId} completed successfully`);
    
  } catch (error) {
    console.error(`❌ Request ${requestId} failed:`, error.message);
    
    // POST error back to Lambda
    try {
      await fetch(payload.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, error: error.message })
      });
    } catch (callbackError) {
      console.error('Failed to send error callback:', callbackError.message);
    }
  }
}

async function poll() {
  try {
    const pending = await getPendingRequests();
    
    if (pending.length > 0) {
      console.log(`📥 Found ${pending.length} pending request(s)`);
      await processRequest(pending[0]);
    }
  } catch (error) {
    console.error('Poll error:', error.message);
  }
  
  setTimeout(poll, POLL_INTERVAL);
}

// Start polling
poll();
