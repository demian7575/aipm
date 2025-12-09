#!/usr/bin/env node
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { execSync } from 'child_process';

const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const QUEUE_TABLE = 'aipm-amazon-q-queue';
const WORKER_POOL_URL = 'http://localhost:8081';
const POLL_INTERVAL = 1000;

async function pollQueue() {
  const { Items } = await dynamodb.send(new ScanCommand({
    TableName: QUEUE_TABLE,
    FilterExpression: '#status = :pending',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':pending': { S: 'pending' } }
  }));

  if (!Items?.length) return;

  for (const item of Items) {
    const taskId = item.id?.S;
    const branch = item.branch?.S;
    const details = item.details?.S || '';
    const repo = item.repo?.S || 'aipm';
    const owner = item.owner?.S || 'demian7575';

    if (!taskId || !branch) {
      console.log('⚠️  Skipping item with missing id or branch');
      continue;
    }

    console.log(`📋 Processing task ${taskId}`);

    try {
      await dynamodb.send(new UpdateItemCommand({
        TableName: QUEUE_TABLE,
        Key: { id: { S: taskId } },
        UpdateExpression: 'SET #status = :processing',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':processing': { S: 'processing' } }
      }));

      const repoPath = `/home/ec2-user/${repo}`;
      execSync(`git stash`, { cwd: repoPath });
      execSync(`git fetch origin ${branch}`, { cwd: repoPath });
      execSync(`git checkout ${branch}`, { cwd: repoPath });

      const response = await fetch(`${WORKER_POOL_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Read TASK.md and implement the feature. ${details}`,
          timeoutMs: 300000
        })
      });

      const result = await response.json();

      if (result.success) {
        execSync(`git add -A && git commit -m "Implement feature" && git push origin ${branch}`, {
          cwd: `/home/ec2-user/${repo}`
        });

        await dynamodb.send(new UpdateItemCommand({
          TableName: QUEUE_TABLE,
          Key: { id: { S: taskId } },
          UpdateExpression: 'SET #status = :complete',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':complete': { S: 'complete' } }
        }));

        console.log(`✅ Task ${taskId} complete`);
      } else {
        throw new Error(result.error || 'No code generated');
      }
    } catch (error) {
      console.error(`❌ Task ${taskId} failed:`, error.message);

      await dynamodb.send(new UpdateItemCommand({
        TableName: QUEUE_TABLE,
        Key: { id: { S: taskId } },
        UpdateExpression: 'SET #status = :failed, errorMessage = :error',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':failed': { S: 'failed' },
          ':error': { S: error.message }
        }
      }));
    }
  }
}

console.log('🔄 Queue worker starting...');
setInterval(pollQueue, POLL_INTERVAL);
