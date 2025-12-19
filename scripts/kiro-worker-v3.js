#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import fetch from 'node-fetch';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const QUEUE_TABLE = process.env.KIRO_QUEUE_TABLE || 'aipm-kiro-queue-dev';
const KIRO_API_URL = process.env.KIRO_API_URL || 'http://localhost:8081';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '1000');

console.log('🚀 Kiro Worker V3 starting...');
console.log(`   Queue table: ${QUEUE_TABLE}`);
console.log(`   Kiro API: ${KIRO_API_URL}`);
console.log(`   Poll interval: ${POLL_INTERVAL}ms`);

async function processQueue() {
  while (true) {
    try {
      // Find pending tasks
      const { Items: tasks } = await dynamodb.send(new QueryCommand({
        TableName: QUEUE_TABLE,
        IndexName: 'status-createdAt-index',
        KeyConditionExpression: '#status = :pending',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':pending': 'pending'
        },
        Limit: 1,
        ScanIndexForward: true // oldest first
      }));
      
      if (!tasks || tasks.length === 0) {
        await sleep(POLL_INTERVAL);
        continue;
      }
      
      const task = tasks[0];
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Processing task: ${task.taskId}`);
      console.log(`   Contract: ${task.contractId}`);
      
      // Update status to processing
      await dynamodb.send(new UpdateCommand({
        TableName: QUEUE_TABLE,
        Key: { taskId: task.taskId },
        UpdateExpression: 'SET #status = :processing, startedAt = :now',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':processing': 'processing',
          ':now': new Date().toISOString()
        }
      }));
      
      const startTime = Date.now();
      
      try {
        // Call Kiro API
        console.log(`📤 Sending to Kiro API...`);
        const response = await fetch(`${KIRO_API_URL}/kiro/v3/transform`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractId: task.contractId,
            inputJson: task.inputJson
          })
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Transform failed');
        }
        
        const duration = Date.now() - startTime;
        console.log(`✅ Transform completed in ${duration}ms`);
        
        // Update task with output
        await dynamodb.send(new UpdateCommand({
          TableName: QUEUE_TABLE,
          Key: { taskId: task.taskId },
          UpdateExpression: 'SET #status = :completed, outputJson = :output, completedAt = :now, duration = :duration',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':completed': 'completed',
            ':output': result.outputJson,
            ':now': new Date().toISOString(),
            ':duration': duration
          }
        }));
        
        // Write output to target table
        if (task.targetTable && task.targetKey) {
          console.log(`📝 Writing to ${task.targetTable}...`);
          await writeToTargetTable(task.targetTable, task.targetKey, result.outputJson);
        }
        
        console.log(`✅ Task completed: ${task.taskId}`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Task failed after ${duration}ms:`, error.message);
        
        // Update task with error
        await dynamodb.send(new UpdateCommand({
          TableName: QUEUE_TABLE,
          Key: { taskId: task.taskId },
          UpdateExpression: 'SET #status = :failed, #error = :error, completedAt = :now, duration = :duration',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#error': 'error'
          },
          ExpressionAttributeValues: {
            ':failed': 'failed',
            ':error': error.message,
            ':now': new Date().toISOString(),
            ':duration': duration
          }
        }));
      }
      
    } catch (error) {
      console.error('❌ Queue processing error:', error);
      await sleep(POLL_INTERVAL);
    }
  }
}

async function writeToTargetTable(tableName, key, outputJson) {
  // Build update expression from outputJson
  const updateParts = [];
  const attrNames = {};
  const attrValues = {};
  
  let i = 0;
  for (const [field, value] of Object.entries(outputJson)) {
    if (field === 'storyId' || field === 'testId') continue; // Skip ID fields
    
    const attrName = `#field${i}`;
    const attrValue = `:value${i}`;
    
    updateParts.push(`${attrName} = ${attrValue}`);
    attrNames[attrName] = field;
    attrValues[attrValue] = value;
    i++;
  }
  
  // Add updatedAt
  updateParts.push('#updatedAt = :updatedAt');
  attrNames['#updatedAt'] = 'updatedAt';
  attrValues[':updatedAt'] = new Date().toISOString();
  
  await dynamodb.send(new UpdateCommand({
    TableName: tableName,
    Key: key,
    UpdateExpression: `SET ${updateParts.join(', ')}`,
    ExpressionAttributeNames: attrNames,
    ExpressionAttributeValues: attrValues
  }));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start processing
processQueue().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
