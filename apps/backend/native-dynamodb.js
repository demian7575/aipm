import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = process.env.STORIES_TABLE || 'aipm-backend-prod-stories';
const ACCEPTANCE_TESTS_TABLE = process.env.ACCEPTANCE_TESTS_TABLE || 'aipm-backend-prod-acceptance-tests';

console.log('DynamoDB: Using tables:', { STORIES_TABLE, ACCEPTANCE_TESTS_TABLE });

export class NativeDynamoDBService {
  // Stories operations
  async getAllStories() {
    try {
      const result = await docClient.send(new ScanCommand({
        TableName: STORIES_TABLE
      }));
      
      const stories = (result.Items || []).map(item => ({
        id: item.id,
        mrId: item.mr_id || 1,
        parentId: item.parent_id || null,
        title: item.title || '',
        description: item.description || '',
        asA: item.as_a || '',
        iWant: item.i_want || '',
        soThat: item.so_that || '',
        components: Array.isArray(item.components) ? item.components : [],
        storyPoint: item.story_points || item.storyPoint || 0,
        assigneeEmail: item.assignee_email || item.assigneeEmail || '',
        status: item.status || 'Draft',
        createdAt: item.created_at || item.createdAt,
        updatedAt: item.updated_at || item.updatedAt
      }));
      
      console.log(`DynamoDB: Retrieved ${stories.length} stories`);
      return stories;
    } catch (error) {
      console.error('DynamoDB getAllStories error:', error);
      return [];
    }
  }

  async getStoryById(id) {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: STORIES_TABLE,
        Key: { id: parseInt(id) }
      }));
      
      if (!result.Item) return null;
      
      const item = result.Item;
      return {
        id: item.id,
        mrId: item.mr_id || 1,
        parentId: item.parent_id || null,
        title: item.title || '',
        description: item.description || '',
        asA: item.as_a || '',
        iWant: item.i_want || '',
        soThat: item.so_that || '',
        components: Array.isArray(item.components) ? item.components : [],
        storyPoint: item.story_points || item.storyPoint || 0,
        assigneeEmail: item.assignee_email || item.assigneeEmail || '',
        status: item.status || 'Draft',
        createdAt: item.created_at || item.createdAt,
        updatedAt: item.updated_at || item.updatedAt
      };
    } catch (error) {
      console.error('DynamoDB getStoryById error:', error);
      return null;
    }
  }

  async createStory(story) {
    try {
      const id = Date.now();
      const item = {
        id,
        mr_id: story.mrId || 1,
        parent_id: story.parentId || null,
        title: story.title,
        description: story.description || '',
        as_a: story.asA || '',
        i_want: story.iWant || '',
        so_that: story.soThat || '',
        components: story.components || [],
        story_points: story.storyPoint || 0,
        assignee_email: story.assigneeEmail || '',
        status: story.status || 'Draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await docClient.send(new PutCommand({
        TableName: STORIES_TABLE,
        Item: item
      }));
      
      return { ...story, id };
    } catch (error) {
      console.error('DynamoDB createStory error:', error);
      throw error;
    }
  }

  async updateStory(id, updates) {
    try {
      const storyId = parseInt(id);
      
      // Check if story exists
      const existing = await docClient.send(new GetCommand({
        TableName: STORIES_TABLE,
        Key: { id: storyId }
      }));
      
      if (!existing.Item) {
        return false;
      }
      
      // Build update expression
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};
      
      // Map of frontend fields to DynamoDB fields
      const fieldMapping = {
        title: 'title',
        description: 'description',
        asA: 'as_a',
        iWant: 'i_want', 
        soThat: 'so_that',
        components: 'components',
        storyPoint: 'story_points',
        assigneeEmail: 'assignee_email',
        status: 'status',
        parentId: 'parent_id'
      };
      
      Object.keys(updates).forEach(key => {
        if (fieldMapping[key] && updates[key] !== undefined) {
          const dbField = fieldMapping[key];
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = dbField;
          expressionAttributeValues[`:${key}`] = updates[key];
        }
      });
      
      // Always update the updated_at timestamp
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updated_at';
      expressionAttributeValues[':updatedAt'] = Date.now();
      
      if (updateExpressions.length === 1) { // Only updatedAt
        return existing.Item;
      }
      
      // Update the story
      const result = await docClient.send(new UpdateCommand({
        TableName: STORIES_TABLE,
        Key: { id: storyId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }));
      
      console.log(`DynamoDB: Updated story ${storyId}`);
      
      // Convert back to frontend format
      const updatedStory = this.convertToFrontendFormat(result.Attributes);
      return updatedStory;
    } catch (error) {
      console.error('DynamoDB updateStory error:', error);
      throw error;
    }
  }

  convertToFrontendFormat(item) {
    return {
      id: item.id,
      mrId: item.mr_id || 1,
      parentId: item.parent_id || null,
      title: item.title || '',
      description: item.description || '',
      asA: item.as_a || '',
      iWant: item.i_want || '',
      soThat: item.so_that || '',
      components: Array.isArray(item.components) ? item.components : [],
      storyPoint: item.story_points || item.storyPoint || 0,
      assigneeEmail: item.assignee_email || item.assigneeEmail || '',
      status: item.status || 'Draft',
      createdAt: item.created_at || item.createdAt,
      updatedAt: item.updated_at || item.updatedAt
    };
  }

  async deleteStory(id) {
    try {
      const storyId = parseInt(id);
      
      // Check if story exists
      const existing = await docClient.send(new GetCommand({
        TableName: STORIES_TABLE,
        Key: { id: storyId }
      }));
      
      if (!existing.Item) {
        return false;
      }
      
      // Get all child stories recursively
      const childStories = await this.getChildStoriesRecursive(storyId);
      
      // Delete all child stories first (bottom-up)
      for (const childId of childStories) {
        await docClient.send(new DeleteCommand({
          TableName: STORIES_TABLE,
          Key: { id: childId }
        }));
        console.log(`DynamoDB: Deleted child story ${childId}`);
      }
      
      // Delete the parent story
      await docClient.send(new DeleteCommand({
        TableName: STORIES_TABLE,
        Key: { id: storyId }
      }));
      
      console.log(`DynamoDB: Deleted parent story ${storyId} and ${childStories.length} child stories`);
      return true;
    } catch (error) {
      console.error('DynamoDB deleteStory error:', error);
      throw error;
    }
  }

  async getChildStoriesRecursive(parentId) {
    try {
      const allChildren = [];
      
      // Get direct children
      const result = await docClient.send(new ScanCommand({
        TableName: STORIES_TABLE,
        FilterExpression: 'parentId = :parentId OR parent_id = :parentId',
        ExpressionAttributeValues: {
          ':parentId': parentId
        }
      }));
      
      const directChildren = result.Items || [];
      
      // For each direct child, get their children recursively
      for (const child of directChildren) {
        const childId = child.id;
        allChildren.push(childId);
        
        // Recursively get grandchildren
        const grandChildren = await this.getChildStoriesRecursive(childId);
        allChildren.push(...grandChildren);
      }
      
      return allChildren;
    } catch (error) {
      console.error('DynamoDB getChildStoriesRecursive error:', error);
      return [];
    }
  }

  // Acceptance tests operations
  async getAcceptanceTests(storyId) {
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
      console.error('DynamoDB getAcceptanceTests error:', error);
      return [];
    }
  }

  // Build hierarchical story structure
  async getStoriesWithHierarchy() {
    const stories = await this.getAllStories();
    console.log(`Building hierarchy for ${stories.length} stories`);
    
    const storyMap = new Map();
    
    // Create map and initialize children arrays
    stories.forEach(story => {
      story.children = [];
      story.acceptanceTests = [];
      story.referenceDocuments = [];
      story.tasks = [];
      story.prs = [];
      story.dependencies = [];
      story.dependents = [];
      story.blockedBy = [];
      story.blocking = [];
      storyMap.set(story.id, story);
    });
    
    // Build parent-child relationships
    stories.forEach(story => {
      if (story.parentId && storyMap.has(story.parentId)) {
        storyMap.get(story.parentId).children.push(story);
      }
    });
    
    // Return ALL stories (not just root stories) for flat display
    console.log(`Returning all ${stories.length} stories`);
    return stories;
  }
}
