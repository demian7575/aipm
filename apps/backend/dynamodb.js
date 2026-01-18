import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = process.env.STORIES_TABLE || 'aipm-backend-dev-stories';
const ACCEPTANCE_TESTS_TABLE = process.env.ACCEPTANCE_TESTS_TABLE || 'aipm-backend-dev-acceptance-tests';

console.log('DynamoDB: Using tables:', { STORIES_TABLE, ACCEPTANCE_TESTS_TABLE });

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
        TableName: ACCEPTANCE_TESTS_TABLE
      }));
      return (result.Items || []).map(item => ({
        id: item.id,
        storyId: item.storyId,
        title: item.title || '',
        given: item.given,
        whenStep: item.whenStep,
        thenStep: item.thenStep,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));
    } catch (error) {
      console.error('DynamoDB: Error getting acceptance tests:', error);
      return [];
    }
  }

  // Stories operations
  async getAllStories() {
    try {
      const result = await docClient.send(new ScanCommand({
        TableName: STORIES_TABLE
      }));
      console.log('DynamoDB: getAllStories result:', result.Items?.length || 0, 'items');
      
      // DynamoDB DocumentClient already converts types, so we just need to map field names
      const stories = (result.Items || []).map(item => ({
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
        TableName: STORIES_TABLE,
        Key: { id: parseInt(id) }
      }));
      return result.Item || null;
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
        TableName: STORIES_TABLE,
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
        TableName: STORIES_TABLE,
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
        TableName: STORIES_TABLE,
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
        TableName: STORIES_TABLE,
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
        TableName: ACCEPTANCE_TESTS_TABLE,
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
        TableName: ACCEPTANCE_TESTS_TABLE,
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
        TableName: ACCEPTANCE_TESTS_TABLE,
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
        TableName: ACCEPTANCE_TESTS_TABLE,
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
        TableName: ACCEPTANCE_TESTS_TABLE,
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
