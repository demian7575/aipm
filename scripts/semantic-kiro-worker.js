#!/usr/bin/env node
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';

const QUEUE_TABLE = process.env.SEMANTIC_QUEUE_TABLE || 'aipm-semantic-api-queue';
const CALLBACK_URL = process.env.SEMANTIC_API_URL || 'http://localhost:8082';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

console.log(`🤖 Semantic Kiro Worker starting...`);
console.log(`📊 Queue table: ${QUEUE_TABLE}`);
console.log(`🔗 Callback URL: ${CALLBACK_URL}`);
console.log(`⏱️  Poll interval: ${POLL_INTERVAL}ms`);

async function pollQueue() {
  try {
    // Scan for pending tasks
    const result = await dynamodb.send(new ScanCommand({
      TableName: QUEUE_TABLE,
      FilterExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':pending': 'pending' },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) {
      return;
    }

    const task = result.Items[0];
    console.log(`\n📥 Found task: ${task.id}`);

    // Mark as processing
    await dynamodb.send(new UpdateCommand({
      TableName: QUEUE_TABLE,
      Key: { id: task.id },
      UpdateExpression: 'SET #status = :processing, startedAt = :startedAt',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { 
        ':processing': 'processing',
        ':startedAt': Date.now()
      }
    }));

    // Process task
    await processTask(task);

  } catch (error) {
    console.error(`❌ Poll error:`, error);
  }
}

async function processTask(task) {
  try {
    const { template, parameters } = task.input;
    
    console.log(`📄 Template: ${template}`);
    console.log(`📊 Parameters:`, JSON.stringify(parameters, null, 2));

    // Read template
    const templateContent = await readFile(template, 'utf-8');

    // Build prompt for Kiro CLI
    const prompt = `${templateContent}\n\n## Input Data\n${JSON.stringify(parameters, null, 2)}\n\nGenerate the output and return ONLY the JSON object, no explanations.`;

    console.log(`🤖 Executing Kiro CLI...`);

    // Execute Kiro CLI
    const kiro = spawn('/home/ec2-user/.local/bin/kiro-cli', ['chat', '--trust-all-tools'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    kiro.stdout.on('data', (data) => {
      output += data.toString();
    });

    kiro.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    kiro.stdin.write(prompt + '\n');
    kiro.stdin.end();

    await new Promise((resolve, reject) => {
      kiro.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Kiro CLI exited with code ${code}: ${errorOutput}`));
        }
      });

      kiro.on('error', reject);
    });

    console.log(`✅ Kiro CLI completed`);

    // Extract JSON from output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Kiro CLI output');
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log(`📤 Result:`, JSON.stringify(result, null, 2));

    // Post result to callback
    const callbackResponse = await fetch(`${CALLBACK_URL}/callback/${task.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });

    if (!callbackResponse.ok) {
      throw new Error(`Callback failed: ${callbackResponse.statusText}`);
    }

    console.log(`✅ Task ${task.id} completed successfully`);

  } catch (error) {
    console.error(`❌ Task ${task.id} failed:`, error);

    // Mark as failed
    await dynamodb.send(new UpdateCommand({
      TableName: QUEUE_TABLE,
      Key: { id: task.id },
      UpdateExpression: 'SET #status = :failed, #error = :error, failedAt = :failedAt',
      ExpressionAttributeNames: { 
        '#status': 'status',
        '#error': 'error'
      },
      ExpressionAttributeValues: { 
        ':failed': 'failed',
        ':error': error.message,
        ':failedAt': Date.now()
      }
    }));
  }
}

// Start polling
console.log(`🔄 Starting queue polling...`);
setInterval(pollQueue, POLL_INTERVAL);
pollQueue(); // Initial poll
