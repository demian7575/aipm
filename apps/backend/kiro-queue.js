// Kiro async queue - Lambda creates requests, Kiro sends results back
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});
const QUEUE_TABLE = process.env.KIRO_QUEUE_TABLE || 'aipm-backend-dev-kiro-queue';

export async function createKiroRequest(type, payload) {
  const requestId = randomUUID();
  const item = {
    requestId,
    type, // 'generate-story', 'generate-test', 'analyze-invest'
    status: 'pending',
    payload,
    createdAt: new Date().toISOString(),
    ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour TTL
  };
  
  await docClient.send(new PutCommand({
    TableName: QUEUE_TABLE,
    Item: item
  }));
  
  console.log(`📝 Created Kiro request: ${requestId} (${type})`);
  return requestId;
}

export async function getKiroRequest(requestId) {
  const result = await docClient.send(new GetCommand({
    TableName: QUEUE_TABLE,
    Key: { requestId }
  }));
  
  return result.Item || null;
}

export async function updateKiroRequest(requestId, result, error = null) {
  await docClient.send(new UpdateCommand({
    TableName: QUEUE_TABLE,
    Key: { requestId },
    UpdateExpression: 'SET #status = :status, #result = :result, #error = :error, completedAt = :completedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#result': 'result',
      '#error': 'error'
    },
    ExpressionAttributeValues: {
      ':status': error ? 'failed' : 'completed',
      ':result': result || null,
      ':error': error || null,
      ':completedAt': new Date().toISOString()
    }
  }));
  
  console.log(`✅ Updated Kiro request: ${requestId} (${error ? 'failed' : 'completed'})`);
}

export async function getPendingRequests() {
  const result = await docClient.send(new QueryCommand({
    TableName: QUEUE_TABLE,
    IndexName: 'status-index',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'pending' }
  }));
  
  return result.Items || [];
}
