// AWS DynamoDB client for direct frontend access
class AWSClient {
  constructor() {
    // Configure AWS SDK
    AWS.config.update({
      region: window.CONFIG.region || 'us-east-1',
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: window.CONFIG.identityPoolId || 'us-east-1:your-identity-pool-id'
      })
    });
    
    this.dynamodb = new AWS.DynamoDB.DocumentClient();
    this.storiesTable = window.CONFIG.storiesTable || 'aipm-backend-prod-stories';
    this.testsTable = window.CONFIG.acceptanceTestsTable || 'aipm-backend-prod-acceptance-tests';
  }

  // Direct DynamoDB operations
  async getStories() {
    try {
      const result = await this.dynamodb.scan({
        TableName: this.storiesTable
      }).promise();
      
      return result.Items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        asA: item.as_a,
        iWant: item.i_want,
        soThat: item.so_that,
        parentId: item.parent_id,
        status: item.status,
        storyPoint: item.storyPoint || 0,
        assigneeEmail: item.assigneeEmail || '',
        components: item.components || [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));
    } catch (error) {
      console.error('Failed to load stories from DynamoDB:', error);
      // Fallback to backend API
      return this.fallbackToAPI('/api/stories');
    }
  }

  async getAcceptanceTests(storyId) {
    try {
      const result = await this.dynamodb.query({
        TableName: this.testsTable,
        IndexName: 'storyId-index',
        KeyConditionExpression: 'storyId = :storyId',
        ExpressionAttributeValues: {
          ':storyId': storyId
        }
      }).promise();
      
      return result.Items;
    } catch (error) {
      console.error('Failed to load tests from DynamoDB:', error);
      return this.fallbackToAPI(`/api/stories/${storyId}/acceptance-tests`);
    }
  }

  async saveStory(story) {
    try {
      await this.dynamodb.put({
        TableName: this.storiesTable,
        Item: {
          id: story.id,
          title: story.title,
          description: story.description,
          as_a: story.asA,
          i_want: story.iWant,
          so_that: story.soThat,
          parent_id: story.parentId,
          status: story.status,
          storyPoint: story.storyPoint,
          assigneeEmail: story.assigneeEmail,
          components: story.components,
          updatedAt: new Date().toISOString()
        }
      }).promise();
      
      return story;
    } catch (error) {
      console.error('Failed to save story to DynamoDB:', error);
      return this.fallbackToAPI('/api/stories', 'POST', story);
    }
  }

  // Validation calls to EC2 backend (only when needed)
  async validateStory(story) {
    try {
      const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/validate/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(story)
      });
      return await response.json();
    } catch (error) {
      console.error('Story validation failed:', error);
      return { valid: false, errors: ['Validation service unavailable'] };
    }
  }

  async createPR(storyData) {
    try {
      const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/create-pr-with-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData)
      });
      return await response.json();
    } catch (error) {
      console.error('PR creation failed:', error);
      throw error;
    }
  }

  // Fallback to backend API if DynamoDB fails
  async fallbackToAPI(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (data) options.body = JSON.stringify(data);
      
      const response = await fetch(`${window.CONFIG.API_BASE_URL}${endpoint}`, options);
      return await response.json();
    } catch (error) {
      console.error('API fallback failed:', error);
      return method === 'GET' ? [] : null;
    }
  }
}

// Global AWS client instance
window.awsClient = new AWSClient();
