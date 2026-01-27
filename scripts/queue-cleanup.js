#!/usr/bin/env node

/**
 * DynamoDB Queue Cleanup Service
 * Automatically cleans up stuck tasks in semantic API queue
 * 
 * Runs every 5 minutes and:
 * 1. Deletes tasks stuck in 'processing' for > 10 minutes
 * 2. Deletes failed tasks older than 24 hours
 * 3. Logs cleanup actions
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.DYNAMODB_QUEUE_TABLE || 'aipm-semantic-api-queue-dev';
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STUCK_THRESHOLD = 10 * 60 * 1000; // 10 minutes
const FAILED_RETENTION = 24 * 60 * 60 * 1000; // 24 hours

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
    
    let deletedCount = 0;
    
    for (const item of Items) {
      let shouldDelete = false;
      let reason = '';
      
      // Delete stuck processing tasks (> 10 minutes)
      if (item.status === 'processing' && item.startedAt) {
        const age = now - item.startedAt;
        if (age > STUCK_THRESHOLD) {
          shouldDelete = true;
          reason = `stuck in processing for ${Math.floor(age / 60000)} minutes`;
        }
      }
      
      // Delete old failed tasks (> 24 hours)
      if (item.status === 'failed' && item.failedAt) {
        const age = now - item.failedAt;
        if (age > FAILED_RETENTION) {
          shouldDelete = true;
          reason = `failed ${Math.floor(age / 3600000)} hours ago`;
        }
      }
      
      if (shouldDelete) {
        await docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { id: item.id }
        }));
        console.log(`[${new Date().toISOString()}] Deleted task ${item.id}: ${reason}`);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[${new Date().toISOString()}] Cleanup completed: ${deletedCount} tasks deleted`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cleanup error:`, error.message);
  }
}

// Run cleanup immediately on start
console.log(`[${new Date().toISOString()}] DynamoDB Queue Cleanup Service started`);
console.log(`[${new Date().toISOString()}] Table: ${TABLE_NAME}`);
console.log(`[${new Date().toISOString()}] Cleanup interval: ${CLEANUP_INTERVAL / 60000} minutes`);
cleanupStuckTasks();

// Run cleanup periodically
setInterval(cleanupStuckTasks, CLEANUP_INTERVAL);
