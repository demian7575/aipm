import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const DEFAULT_STORIES_TABLE = process.env.STORIES_TABLE;
const DEFAULT_ACCEPTANCE_TESTS_TABLE = process.env.ACCEPTANCE_TESTS_TABLE;

console.log('DynamoDB: Default tables:', { DEFAULT_STORIES_TABLE, DEFAULT_ACCEPTANCE_TESTS_TABLE });

// Request context for per-request table override
let requestContext = null;

export function setRequestContext(context) {
  requestContext = context;
}

export function clearRequestContext() {
  requestContext = null;
}

function getStoriesTable() {
  return requestContext?.storiesTable ?? DEFAULT_STORIES_TABLE;
}

function getAcceptanceTestsTable() {
  return requestContext?.acceptanceTestsTable ?? DEFAULT_ACCEPTANCE_TESTS_TABLE;
}

export class DynamoDBDataLayer {
  constructor() {
    this.docClient = docClient;
  }

  // SQLite compatibility methods
  prepare(sql) {
    return {
      run: async (...params) => {
        if (sql.includes('DELETE FROM user_stories WHERE id = ?')) {
          const id = params[0];
          await this.deleteStory(id);
          return { changes: 1 };
        }
        if (sql.includes('DELETE FROM acceptance_tests WHERE id = ?')) {
          const id = params[0];
          await this.deleteAcceptanceTest(id);
          return { changes: 1 };
        }
        return { changes: 1 };
      },
      get: async (...params) => {
        if (sql.includes('SELECT') && sql.includes('user_stories')) {
          const id = params[0];
          return await this.getStoryById(id);
        }
        return null;
      },
      all: async (...params) => {
        if (sql.includes('SELECT') && sql.includes('user_stories')) {
          return await this.getAllStories();
        }
        return [];
      }
    };
  }
  async safeSelectAll(sql) {
    if (sql.includes('user_stories')) {
      return await this.getAllStories();
    }
    if (sql.includes('acceptance_tests')) {
      return await this.getAllAcceptanceTests();
    }
    return [];
  }

  exec(sql) {
    // No-op for DynamoDB
  }

  close() {
    // No-op for DynamoDB
  }

  async getAllAcceptanceTests() {
    try {
      const result = await docClient.send(new ScanCommand({
        TableName: getAcceptanceTestsTable()
      }));
      return (result.Items || []).map(item => ({
        id: item.id,
        story_id: item.storyId,  // Convert to snake_case for compatibility
        title: item.title || '',
        given: item.given,
        when_step: item.whenStep,  // Convert to snake_case
        then_step: item.thenStep,  // Convert to snake_case
        status: item.status,
        created_at: item.createdAt,  // Convert to snake_case
        updated_at: item.updatedAt   // Convert to snake_case
      }));
    } catch (error) {
      console.error('DynamoDB: Error getting acceptance tests:', error);
      return [];
    }
  }

  // Stories operations
  async getAllStories() {
    try {
      let allItems = [];
      let lastKey = undefined;
      
      do {
        const result = await docClient.send(new ScanCommand({
          TableName: getStoriesTable(),
          ExclusiveStartKey: lastKey
        }));
        
        allItems = allItems.concat(result.Items || []);
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);
      
      console.log('DynamoDB: getAllStories result:', allItems.length, 'items');
      
      const stories = allItems.map(item => ({
        id: item.id,
        parentId: item.parentId,
        title: item.title || '',
        description: item.description || '',
        asA: item.asA || '',
        iWant: item.iWant || '',
        soThat: item.soThat || '',
        components: item.components || '[]',
        storyPoint: item.storyPoint || 0,
        assigneeEmail: item.assigneeEmail || '',
        status: item.status == null ? 'Draft' : item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        investAnalysis: item.investAnalysis,
        mrId: item.mrId || 1,
        prs: item.prs || '[]'
      }));
      
      return stories;
    } catch (error) {
      console.error('DynamoDB: Error getting all stories:', error);
      return [];
    }
  }

  async getStoryById(id) {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: getStoriesTable(),
        Key: { id: parseInt(id) }
      }));
      console.log('getStoryById raw result:', JSON.stringify(result.Item));
      if (!result.Item) return null;
      
      const item = result.Item;
      const mapped = {
        id: item.id,
        parentId: item.parentId,
        title: item.title || '',
        description: item.description || '',
        asA: item.asA || '',
        iWant: item.iWant || '',
        soThat: item.soThat || '',
        components: item.components || '[]',
        storyPoint: item.storyPoint || 0,
        assigneeEmail: item.assigneeEmail || '',
        status: item.status == null ? 'Draft' : item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        investAnalysis: item.investAnalysis,
        mrId: item.mrId || 1,
        prs: item.prs || '[]'
      };
      console.log('getStoryById mapped result:', JSON.stringify(mapped));
      return mapped;
    } catch (error) {
      console.error('Error getting story by id:', error);
      return null;
    }
  }

  async createStory(story) {
    try {
      const id = Date.now(); // Simple ID generation
      const storyWithId = { 
        ...story, 
        id,
        // Ensure required fields
        title: story.title || '',
        description: story.description || '',
        status: story.status || 'Draft',
        parentId: story.parentId || null,
        createdAt: story.createdAt || new Date().toISOString(),
        updatedAt: story.updatedAt || new Date().toISOString()
      };
      
      console.log('DynamoDB: Creating story:', JSON.stringify(storyWithId, null, 2));
      
      await docClient.send(new PutCommand({
        TableName: getStoriesTable(),
        Item: storyWithId
      }));
      
      console.log('DynamoDB: Story created successfully with ID:', id);
      return storyWithId;
    } catch (error) {
      console.error('DynamoDB: Error creating story:', error);
      throw error;
    }
  }

  async deleteStory(id) {
    try {
      await docClient.send(new DeleteCommand({
        TableName: getStoriesTable(),
        Key: { id: parseInt(id) }
      }));
      console.log('DynamoDB: Deleted story with ID:', id);
      return true;
    } catch (error) {
      console.error('DynamoDB: Error deleting story:', error);
      throw error;
    }
  }

  async updateStory(id, updates) {
    try {
      const updateExpression = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {};

      Object.keys(updates).forEach(key => {
        if (key !== 'id') {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updates[key];
        }
      });

      await docClient.send(new UpdateCommand({
        TableName: getStoriesTable(),
        Key: { id: parseInt(id) },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }));

      return await this.getStoryById(id);
    } catch (error) {
      console.error('Error updating story:', error);
      throw error;
    }
  }

  async deleteStory(id) {
    try {
      await docClient.send(new DeleteCommand({
        TableName: getStoriesTable(),
        Key: { id: parseInt(id) }
      }));
      return true;
    } catch (error) {
      console.error('Error deleting story:', error);
      return false;
    }
  }

  // Acceptance tests operations
  async getAcceptanceTestsByStoryId(storyId) {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: getAcceptanceTestsTable(),
        IndexName: 'story_id-index',
        KeyConditionExpression: 'story_id = :story_id',
        ExpressionAttributeValues: {
          ':story_id': parseInt(storyId)
        }
      }));
      return result.Items || [];
    } catch (error) {
      console.error('Error getting acceptance tests:', error);
      return [];
    }
  }

  async createAcceptanceTest(test) {
    try {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const testWithId = { ...test, id, story_id: parseInt(test.storyId || test.story_id) };
      await docClient.send(new PutCommand({
        TableName: getAcceptanceTestsTable(),
        Item: testWithId
      }));
      return testWithId;
    } catch (error) {
      console.error('Error creating acceptance test:', error);
      throw error;
    }
  }

  async updateAcceptanceTest(id, updates) {
    try {
      const updateExpression = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {};

      Object.keys(updates).forEach(key => {
        if (key !== 'id') {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updates[key];
        }
      });

      await docClient.send(new UpdateCommand({
        TableName: getAcceptanceTestsTable(),
        Key: { id: parseInt(id) },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }));

      return await this.getAcceptanceTestById(id);
    } catch (error) {
      console.error('Error updating acceptance test:', error);
      throw error;
    }
  }

  async getAcceptanceTestById(id) {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: getAcceptanceTestsTable(),
        Key: { id: parseInt(id) }
      }));
      return result.Item || null;
    } catch (error) {
      console.error('Error getting acceptance test by id:', error);
      return null;
    }
  }

  async deleteAcceptanceTest(id) {
    try {
      await docClient.send(new DeleteCommand({
        TableName: getAcceptanceTestsTable(),
        Key: { id: parseInt(id) }
      }));
      return true;
    } catch (error) {
      console.error('Error deleting acceptance test:', error);
      return false;
    }
  }
}

export const db = new DynamoDBDataLayer();
