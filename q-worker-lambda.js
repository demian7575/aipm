// Lambda function triggered by DynamoDB Stream
// Processes queue tasks and creates PRs with Amazon Q

import { spawn } from 'child_process';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
  console.log('Received DynamoDB event:', JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT' && record.eventName !== 'MODIFY') {
      continue;
    }
    
    const newImage = record.dynamodb.NewImage;
    const status = newImage.status?.S;
    
    // Only process pending tasks
    if (status !== 'pending') {
      continue;
    }
    
    const taskId = newImage.id?.S;
    const title = newImage.title?.S;
    const details = newImage.details?.S;
    const branch = newImage.branch?.S;
    const owner = newImage.owner?.S;
    const repo = newImage.repo?.S;
    
    console.log(`Processing task: ${taskId} - ${title}`);
    
    try {
      // Mark as processing
      await docClient.send(new UpdateCommand({
        TableName: process.env.QUEUE_TABLE || 'aipm-amazon-q-queue',
        Key: { id: taskId },
        UpdateExpression: 'SET #status = :processing',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':processing': 'processing' }
      }));
      
      // Generate code with Amazon Q CLI
      const result = await generateCodeWithQ(title, details, branch, owner, repo);
      
      // Mark as complete
      await docClient.send(new UpdateCommand({
        TableName: process.env.QUEUE_TABLE || 'aipm-amazon-q-queue',
        Key: { id: taskId },
        UpdateExpression: 'SET #status = :complete, prUrl = :url',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { 
          ':complete': 'complete',
          ':url': result.prUrl
        }
      }));
      
      console.log(`✅ Task ${taskId} completed: ${result.prUrl}`);
    } catch (error) {
      console.error(`❌ Task ${taskId} failed:`, error);
      
      // Mark as failed
      await docClient.send(new UpdateCommand({
        TableName: process.env.QUEUE_TABLE || 'aipm-amazon-q-queue',
        Key: { id: taskId },
        UpdateExpression: 'SET #status = :failed, errorMessage = :error',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { 
          ':failed': 'failed',
          ':error': error.message
        }
      }));
    }
  }
  
  return { statusCode: 200, body: 'Processed' };
};

async function generateCodeWithQ(title, details, branch, owner, repo) {
  return new Promise((resolve, reject) => {
    const prompt = `Implement: ${title}\n\nDetails: ${details}\n\nCreate a PR with the implementation.`;
    
    // Use Amazon Q CLI
    const q = spawn('q', ['chat', '--non-interactive', prompt], {
      env: {
        ...process.env,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        GITHUB_OWNER: owner,
        GITHUB_REPO: repo,
        BRANCH_NAME: branch
      }
    });
    
    let output = '';
    let error = '';
    
    q.stdout.on('data', (data) => {
      output += data.toString();
      console.log(data.toString());
    });
    
    q.stderr.on('data', (data) => {
      error += data.toString();
      console.error(data.toString());
    });
    
    q.on('close', (code) => {
      if (code === 0) {
        // Extract PR URL from output
        const prUrlMatch = output.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/);
        resolve({
          prUrl: prUrlMatch ? prUrlMatch[0] : 'PR created',
          output
        });
      } else {
        reject(new Error(`Q CLI failed with code ${code}: ${error}`));
      }
    });
  });
}
