import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const QUEUE_TABLE = process.env.KIRO_QUEUE_TABLE || 'aipm-kiro-queue-dev';
const STORIES_TABLE = process.env.STORIES_TABLE || 'aipm-backend-dev-stories';

// POST /api/stories/:id/enhance - Queue story enhancement
export async function enhanceStory(event) {
  try {
    const storyId = event.pathParameters?.id;
    if (!storyId) {
      return response(400, { error: 'Missing story ID' });
    }
    
    // Get story from DynamoDB
    const { Item: story } = await dynamodb.send(new GetCommand({
      TableName: STORIES_TABLE,
      Key: { id: storyId }
    }));
    
    if (!story) {
      return response(404, { error: 'Story not found' });
    }
    
    // Build input JSON matching contract
    const inputJson = {
      storyId: story.id,
      title: story.title || '',
      description: story.description || '',
      asA: story.asA || '',
      iWant: story.iWant || '',
      soThat: story.soThat || '',
      storyPoint: story.storyPoint || 0,
      parentId: story.parentId || null,
      components: story.components || []
    };
    
    // Create queue task
    const taskId = randomUUID();
    await dynamodb.send(new PutCommand({
      TableName: QUEUE_TABLE,
      Item: {
        taskId,
        contractId: 'enhance-story-v1',
        status: 'pending',
        inputJson,
        targetTable: STORIES_TABLE,
        targetKey: { id: storyId },
        createdAt: new Date().toISOString()
      }
    }));
    
    console.log(`✅ Queued enhancement task: ${taskId} for story: ${storyId}`);
    
    return response(202, {
      taskId,
      status: 'pending',
      message: 'Story enhancement queued'
    });
    
  } catch (error) {
    console.error('Error queueing enhancement:', error);
    return response(500, { error: error.message });
  }
}

// GET /api/tasks/:taskId - Get task status
export async function getTaskStatus(event) {
  try {
    const taskId = event.pathParameters?.taskId;
    if (!taskId) {
      return response(400, { error: 'Missing task ID' });
    }
    
    const { Item: task } = await dynamodb.send(new GetCommand({
      TableName: QUEUE_TABLE,
      Key: { taskId }
    }));
    
    if (!task) {
      return response(404, { error: 'Task not found' });
    }
    
    return response(200, {
      taskId: task.taskId,
      contractId: task.contractId,
      status: task.status,
      outputJson: task.outputJson || null,
      error: task.error || null,
      createdAt: task.createdAt,
      completedAt: task.completedAt || null,
      duration: task.duration || null
    });
    
  } catch (error) {
    console.error('Error getting task status:', error);
    return response(500, { error: error.message });
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}
