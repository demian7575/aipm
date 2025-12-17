import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TASK_QUEUE_TABLE = process.env.TASK_QUEUE_TABLE;

export const handler = async (event) => {
  console.log('Queue processor triggered:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventName === 'INSERT') {
      const task = record.dynamodb.NewImage;
      const taskId = task.taskId.S;
      
      console.log(`Processing task: ${taskId}`);
      
      try {
        // Update task status to processing
        await docClient.send(new UpdateCommand({
          TableName: TASK_QUEUE_TABLE,
          Key: { taskId },
          UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': 'processing',
            ':updatedAt': Date.now()
          }
        }));

        // TODO: Integrate with actual Kiro CLI when available
        // For now, just mark as completed
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update task status to completed
        await docClient.send(new UpdateCommand({
          TableName: TASK_QUEUE_TABLE,
          Key: { taskId },
          UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, result = :result',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': 'completed',
            ':updatedAt': Date.now(),
            ':result': { message: 'Task processed successfully' }
          }
        }));

        console.log(`Task ${taskId} completed successfully`);

      } catch (error) {
        console.error(`Error processing task ${taskId}:`, error);
        
        // Update task status to failed
        await docClient.send(new UpdateCommand({
          TableName: TASK_QUEUE_TABLE,
          Key: { taskId },
          UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, error = :error',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': 'failed',
            ':updatedAt': Date.now(),
            ':error': error.message
          }
        }));
      }
    }
  }

  return { statusCode: 200, body: 'Processing completed' };
};
