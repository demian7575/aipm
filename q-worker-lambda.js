// Lambda triggered by DynamoDB Stream to process queue tasks
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT' && record.eventName !== 'MODIFY') continue;
    
    const newImage = record.dynamodb.NewImage;
    if (newImage.status?.S !== 'pending') continue;
    
    const taskId = newImage.id?.S;
    const title = newImage.title?.S;
    const details = newImage.details?.S;
    const branch = newImage.branch?.S;
    const owner = newImage.owner?.S;
    const repo = newImage.repo?.S;
    
    console.log(`Processing: ${taskId} - ${title}`);
    
    try {
      await docClient.send(new UpdateCommand({
        TableName: process.env.QUEUE_TABLE,
        Key: { id: taskId },
        UpdateExpression: 'SET #status = :processing',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':processing': 'processing' }
      }));
      
      // Trigger GitHub Actions workflow
      const workflowUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/q-code-generation.yml/dispatches`;
      const payload = {
        ref: 'develop',
        inputs: { 
          taskDescription: `${title}\n\n${details}`
        }
      };
      
      console.log(`Triggering workflow: ${workflowUrl}`);
      console.log(`Payload:`, JSON.stringify(payload, null, 2));
      
      const response = await fetch(workflowUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API ${response.status}: ${errorText}`);
      }
      
      await docClient.send(new UpdateCommand({
        TableName: process.env.QUEUE_TABLE,
        Key: { id: taskId },
        UpdateExpression: 'SET #status = :complete',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':complete': 'complete' }
      }));
      
      console.log(`✅ Workflow triggered for ${taskId}`);
    } catch (error) {
      console.error(`❌ Failed ${taskId}:`, error);
      await docClient.send(new UpdateCommand({
        TableName: process.env.QUEUE_TABLE,
        Key: { id: taskId },
        UpdateExpression: 'SET #status = :failed, errorMessage = :error',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':failed': 'failed', ':error': error.message }
      }));
    }
  }
  return { statusCode: 200 };
};
