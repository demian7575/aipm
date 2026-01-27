#!/usr/bin/env node

/**
 * DynamoDB Queue Cleanup Service
 * Automatically cleans up stuck tasks in semantic API queue
 * 
 * Runs every 5 minutes and:
 * 1. Retries tasks stuck in 'processing' for > 10 minutes (max 3 retries)
 * 2. Deletes tasks that failed 3 retries
 * 3. Deletes failed tasks older than 24 hours
 * 4. Logs cleanup actions
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.DYNAMODB_QUEUE_TABLE || 'aipm-semantic-api-queue-dev';
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STUCK_THRESHOLD = 10 * 60 * 1000; // 10 minutes
const FAILED_RETENTION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function cleanupStuckTasks() {
  const now = Date.now();
  
  try {
    // Scan all items
    const { Items } = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME
    }));
    
    if (!Items || Items.length === 0) {
      console.log(`[${new Date().toISOString()}] No items in queue`);
      return;
    }
    
    let retriedCount = 0;
    let deletedCount = 0;
    
    for (const item of Items) {
      const retryCount = item.retryCount || 0;
      
      // Handle stuck processing tasks
      if (item.status === 'processing' && item.startedAt) {
        const age = now - item.startedAt;
        
        if (age > STUCK_THRESHOLD) {
          if (retryCount < MAX_RETRIES) {
            // Retry: processing → pending
            await docClient.send(new UpdateCommand({
              TableName: TABLE_NAME,
              Key: { id: item.id },
              UpdateExpression: 'SET #status = :pending, retryCount = :count, lastRetryAt = :now',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':pending': 'pending',
                ':count': retryCount + 1,
                ':now': now
              }
            }));
            console.log(`[${new Date().toISOString()}] Retried task ${item.id} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            retriedCount++;
          } else {
            // Max retries reached - delete
            await docClient.send(new DeleteCommand({
              TableName: TABLE_NAME,
              Key: { id: item.id }
            }));
            console.log(`[${new Date().toISOString()}] Deleted task ${item.id}: failed after ${MAX_RETRIES} retries`);
            deletedCount++;
          }
        }
      }
      
      // Delete old failed tasks (> 24 hours)
      if (item.status === 'failed' && item.failedAt) {
        const age = now - item.failedAt;
        if (age > FAILED_RETENTION) {
          await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { id: item.id }
          }));
          console.log(`[${new Date().toISOString()}] Deleted task ${item.id}: failed ${Math.floor(age / 3600000)} hours ago`);
          deletedCount++;
        }
      }
    }
    
    if (retriedCount > 0 || deletedCount > 0) {
      console.log(`[${new Date().toISOString()}] Cleanup completed: ${retriedCount} retried, ${deletedCount} deleted`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cleanup error:`, error.message);
  }
}

// Run cleanup immediately on start
console.log(`[${new Date().toISOString()}] DynamoDB Queue Cleanup Service started`);
console.log(`[${new Date().toISOString()}] Table: ${TABLE_NAME}`);
console.log(`[${new Date().toISOString()}] Cleanup interval: ${CLEANUP_INTERVAL / 60000} minutes`);
console.log(`[${new Date().toISOString()}] Max retries: ${MAX_RETRIES}`);
cleanupStuckTasks();

// Run cleanup periodically
setInterval(cleanupStuckTasks, CLEANUP_INTERVAL);
