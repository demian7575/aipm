#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function fix() {
  await docClient.send(new UpdateCommand({
    TableName: 'aipm-backend-prod-stories',
    Key: { id: 100064 },
    UpdateExpression: 'SET parentId = :p',
    ExpressionAttributeValues: { ':p': 6100 }
  }));
  
  await docClient.send(new UpdateCommand({
    TableName: 'aipm-backend-prod-stories',
    Key: { id: 100017 },
    UpdateExpression: 'SET parentId = :p',
    ExpressionAttributeValues: { ':p': 5530 }
  }));
  
  await docClient.send(new UpdateCommand({
    TableName: 'aipm-backend-prod-stories',
    Key: { id: 100035 },
    UpdateExpression: 'SET parentId = :p',
    ExpressionAttributeValues: { ':p': 5530 }
  }));
  
  await docClient.send(new UpdateCommand({
    TableName: 'aipm-backend-prod-stories',
    Key: { id: 100058 },
    UpdateExpression: 'SET parentId = :p',
    ExpressionAttributeValues: { ':p': 1230 }
  }));
  
  console.log('✅ Fixed');
}

fix().catch(console.error);
