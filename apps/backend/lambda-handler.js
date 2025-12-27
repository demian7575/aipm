import { NativeDynamoDBService } from './native-dynamodb.js';

const db = new NativeDynamoDBService();

export const handler = async (event, context) => {
  console.log('Lambda event:', JSON.stringify(event, null, 2));
  
  try {
    const { httpMethod, path, queryStringParameters } = event;
    const pathSegments = path.split('/').filter(Boolean);
    
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Content-Type': 'application/json'
    };
    
    // Handle OPTIONS requests
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
    
    // Route: GET /api/stories
    if (httpMethod === 'GET' && pathSegments[0] === 'api' && pathSegments[1] === 'stories' && pathSegments.length === 2) {
      console.log('Fetching all stories...');
      const stories = await db.getStoriesWithHierarchy();
      console.log(`Returning ${stories.length} stories`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(stories)
      };
    }
    
    // Route: GET /api/stories/{id}
    if (httpMethod === 'GET' && pathSegments[0] === 'api' && pathSegments[1] === 'stories' && pathSegments[2]) {
      const storyId = pathSegments[2];
      console.log(`Fetching story ${storyId}...`);
      const story = await db.getStoryById(storyId);
      
      if (!story) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Story not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(story)
      };
    }
    
    // Route: POST /api/stories
    if (httpMethod === 'POST' && pathSegments[0] === 'api' && pathSegments[1] === 'stories') {
      const body = JSON.parse(event.body || '{}');
      console.log('Creating story:', body);
      
      const story = await db.createStory(body);
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(story)
      };
    }
    
    // Route: DELETE /api/stories/{id}
    if (httpMethod === 'DELETE' && pathSegments[0] === 'api' && pathSegments[1] === 'stories' && pathSegments[2]) {
      const storyId = pathSegments[2];
      console.log(`Deleting story ${storyId}...`);
      
      try {
        const result = await db.deleteStory(storyId);
        
        if (!result) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Story not found' })
          };
        }
        
        return {
          statusCode: 204,
          headers,
          body: ''
        };
      } catch (error) {
        console.error(`Error deleting story ${storyId}:`, error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to delete story' })
        };
      }
    }
    
    // Route: POST /api/stories/draft
    if (httpMethod === 'POST' && pathSegments[0] === 'api' && pathSegments[1] === 'stories' && pathSegments[2] === 'draft') {
      const body = JSON.parse(event.body || '{}');
      const idea = String(body.idea ?? '').trim();
      const parentId = body.parentId;
      
      if (!idea) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Idea text is required' })
        };
      }
      
      console.log('📝 Generating enhanced draft locally for:', idea.substring(0, 50));
      
      // Get parent story context if provided
      let parent = null;
      if (parentId) {
        try {
          parent = await db.getStoryById(parentId);
        } catch (error) {
          console.warn('Could not fetch parent story:', error);
        }
      }
      
      // Generate enhanced draft without Kiro API
      const enhancedDraft = {
        storyId: `story-${Date.now()}`,
        title: idea.charAt(0).toUpperCase() + idea.slice(1),
        description: `Implement ${idea.toLowerCase()} functionality to improve user experience and system capabilities.`,
        asA: parent ? `user of ${parent.title}` : 'system user',
        iWant: `to ${idea.toLowerCase()}`,
        soThat: 'I can accomplish my goals more effectively',
        acceptanceCriteria: [
          `System successfully implements ${idea.toLowerCase()}`,
          'User interface is intuitive and responsive',
          'All edge cases are handled gracefully',
          'Performance meets acceptable standards'
        ],
        enhanced: true,
        enhancedAt: new Date().toISOString()
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(enhancedDraft)
      };
    }
    
    // Route: GET /api/stories/{id}/acceptance-tests
    if (httpMethod === 'GET' && pathSegments[0] === 'api' && pathSegments[1] === 'stories' && pathSegments[3] === 'acceptance-tests') {
      const storyId = pathSegments[2];
      console.log(`Fetching acceptance tests for story ${storyId}...`);
      const tests = await db.getAcceptanceTests(storyId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(tests)
      };
    }
    
    // Health check
    if (httpMethod === 'GET' && pathSegments[0] === 'health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          status: 'healthy',
          service: 'aipm-native-lambda',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Default 404
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('Lambda error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
