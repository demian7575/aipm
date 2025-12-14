#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'aipm-amazon-q-queue';

async function cleanupFailedTasks() {
  try {
    console.log('🔍 Scanning for failed tasks...');
    
    const scanResult = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#status = :failed',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':failed': 'failed' }
    }));

    const failedTasks = scanResult.Items || [];
    console.log(`📊 Found ${failedTasks.length} failed tasks`);

    if (failedTasks.length === 0) {
      console.log('✅ No failed tasks to clean up');
      return;
    }

    // Delete failed tasks older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let deletedCount = 0;

    for (const task of failedTasks) {
      if (task.createdAt < oneDayAgo) {
        try {
          await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { id: task.id }
          }));
          console.log(`🗑️  Deleted failed task: ${task.id} (${task.title || 'Untitled'})`);
          deletedCount++;
        } catch (error) {
          console.error(`❌ Failed to delete task ${task.id}:`, error.message);
        }
      }
    }

    console.log(`✅ Cleanup complete: ${deletedCount} tasks deleted`);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

cleanupFailedTasks();
