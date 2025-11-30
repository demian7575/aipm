import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = process.env.STORIES_TABLE;
const ACCEPTANCE_TESTS_TABLE = process.env.ACCEPTANCE_TESTS_TABLE;
const MINDMAP_SETTINGS_TABLE = process.env.MINDMAP_SETTINGS_TABLE || 'aipm-mindmap-settings';

export class DynamoDBDataLayer {
  // SQLite compatibility methods
  prepare(sql) {
    // Return a mock statement that handles basic operations
    return {
      run: async (...params) => {
        if (sql.includes('INSERT INTO user_stories')) {
          // Extract values and create story
          const story = this._parseInsertParams(params);
          const result = await this.createStory(story);
          return { lastInsertRowid: result.id };
        }
        if (sql.includes('DELETE FROM user_stories WHERE id = ?')) {
          // Delete story by ID
          const id = params[0];
          await this.deleteStory(id);
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

  // Add safeSelectAll method for SQLite compatibility
  async safeSelectAll(sql) {
    console.log('DynamoDB: safeSelectAll called with:', sql.substring(0, 50) + '...');
    
    if (sql.includes('user_stories')) {
      const stories = await this.getAllStories();
      console.log('DynamoDB: Returning', stories.length, 'stories');
      return stories;
    }
    
    // For other tables, return empty arrays for now
    if (sql.includes('acceptance_tests')) {
      return [];
    }
    if (sql.includes('reference_documents')) {
      return [];
    }
    if (sql.includes('tasks')) {
      return [];
    }
    if (sql.includes('story_dependencies')) {
      return [];
    }
    
    console.log('DynamoDB: Unknown table in query, returning empty array');
    return [];
  }

  exec(sql) {
    // Mock exec for schema creation - not needed in DynamoDB
    console.log('DynamoDB: Ignoring SQL exec:', sql.substring(0, 50) + '...');
  }

  close() {
    // No-op for DynamoDB
  }

  _parseInsertParams(params) {
    // Parameter parsing for story creation - SQL has mr_id as first param (hardcoded to 1)
    // SQL: INSERT INTO user_stories (mr_id, parent_id, title, description, as_a, i_want, so_that, components, story_point, assignee_email, status, created_at, updated_at)
    // But params array doesn't include mr_id since it's hardcoded, so params are:
    // [parentId, title, description, asA, iWant, soThat, components, storyPoint, assigneeEmail, status, createdAt, updatedAt]
    const [parentId, title, description, asA, iWant, soThat, components, storyPoint, assigneeEmail, status, createdAt, updatedAt] = params;
    return {
      parentId: parentId || null,
      title: title || '',
      description: description || '',
      asA: asA || '',
      iWant: iWant || '',
      soThat: soThat || '',
      components: components || '[]',
      storyPoint: storyPoint || 0,
      assigneeEmail: assigneeEmail || '',
      status: status || 'Draft',
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString()
    };
  }

  // Stories operations
  async getAllStories() {
    try {
      const result = await docClient.send(new ScanCommand({
        TableName: STORIES_TABLE
      }));
      console.log('DynamoDB: getAllStories result:', result.Items?.length || 0, 'items');
      return result.Items || [];
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
        IndexName: 'storyId-index',
        KeyConditionExpression: 'storyId = :storyId',
        ExpressionAttributeValues: {
          ':storyId': parseInt(storyId)
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
      const id = Date.now() + Math.floor(Math.random() * 1000); // Avoid collisions
      const testWithId = { ...test, id, storyId: parseInt(test.storyId) };
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

  // Mindmap settings operations
  async getMindmapSettings(userId = 'default') {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: MINDMAP_SETTINGS_TABLE,
        Key: { userId }
      }));
      return result.Item || null;
    } catch (error) {
      console.error('Error getting mindmap settings:', error);
      return null;
    }
  }

  async saveMindmapSettings(userId = 'default', settings) {
    try {
      await docClient.send(new PutCommand({
        TableName: MINDMAP_SETTINGS_TABLE,
        Item: {
          userId,
          ...settings,
          updatedAt: new Date().toISOString()
        }
      }));
      return true;
    } catch (error) {
      console.error('Error saving mindmap settings:', error);
      return false;
    }
  }
}

export const db = new DynamoDBDataLayer();
