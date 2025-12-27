import { NativeDynamoDBService } from './native-dynamodb.js';

const db = new NativeDynamoDBService();

export const getStories = async (event, context) => {
  try {
    console.log('getStories function called');
    const stories = await db.getStoriesWithHierarchy();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stories)
    };
  } catch (error) {
    console.error('getStories error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to get stories' })
    };
  }
};

export const getStory = async (event, context) => {
  try {
    const { id } = event.pathParameters;
    console.log(`getStory function called for ID: ${id}`);
    const story = await db.getStoryById(id);
    
    if (!story) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Story not found' })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(story)
    };
  } catch (error) {
    console.error('getStory error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to get story' })
    };
  }
};

export const createStory = async (event, context) => {
  try {
    const body = JSON.parse(event.body || '{}');
    console.log('createStory function called:', body);
    const story = await db.createStory(body);
    
    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(story)
    };
  } catch (error) {
    console.error('createStory error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to create story' })
    };
  }
};

export const generateStoryDraft = async (event, context) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const idea = String(body.idea ?? '').trim();
    const parentId = body.parentId;
    
    if (!idea) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Idea text is required' })
      };
    }
    
    console.log('🤖 Using Kiro API v4 for story enhancement:', idea.substring(0, 50));
    
    // Get parent story context if provided
    let parent = null;
    if (parentId) {
      try {
        parent = await db.getStoryById(parentId);
      } catch (error) {
        console.warn('Could not fetch parent story:', error);
      }
    }
    
    // Try Kiro API v4 with callback storage
    try {
      const kiroApiUrl = process.env.KIRO_API_URL || 'http://44.220.45.57:8081';
      const callbackUrl = `${process.env.API_GATEWAY_URL || 'https://x3erss4aec.execute-api.us-east-1.amazonaws.com/prod'}/api/stories/draft/callback`;
      
      const enhancedIdea = parent ? `${idea} (child of: ${parent.title})` : idea;
      
      const response = await fetch(`${kiroApiUrl}/kiro/v4/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: enhancedIdea,
          callbackUrl
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        console.log('✅ Kiro API v4 request sent successfully');
        
        // Wait a bit for fast AI responses
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Return processing status - frontend should poll or use WebSocket for updates
        return {
          statusCode: 202,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: true,
            message: 'Story enhancement in progress via Kiro API v4',
            idea: idea.substring(0, 100),
            status: 'processing',
            estimatedTime: '5-10 seconds'
          })
        };
      }
      
      console.warn('⚠️ Kiro API v4 returned non-OK response:', response.status);
    } catch (kiroError) {
      console.warn('⚠️ Kiro API v4 error:', kiroError.message);
    }
    
    // Fallback to local generation
    console.log('📝 Falling back to local enhanced generation...');
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(enhancedDraft)
    };
  } catch (error) {
    console.error('generateStoryDraft error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to generate story draft' })
    };
  }
};

// Callback endpoint for Kiro API v4 responses
export const handleStoryDraftCallback = async (event, context) => {
  try {
    const enhancedStory = JSON.parse(event.body || '{}');
    
    console.log('📥 Received Kiro API v4 callback:', enhancedStory.storyId);
    
    // Validate the enhanced story structure
    if (!enhancedStory.storyId || !enhancedStory.title || !enhancedStory.acceptanceCriteria) {
      throw new Error('Invalid enhanced story structure from Kiro API v4');
    }
    
    // Store the enhanced story in a temporary location or return it
    // For now, just log it and return success
    console.log('✅ Enhanced story received from Kiro API v4:', JSON.stringify(enhancedStory, null, 2));
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Enhanced story received successfully',
        storyId: enhancedStory.storyId
      })
    };
    
  } catch (error) {
    console.error('handleStoryDraftCallback error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to process callback' })
    };
  }
};

export const updateStory = async (event, context) => {
  try {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    console.log(`updateStory function called for ID: ${id}`, body);
    
    const result = await db.updateStory(id, body);
    
    if (!result) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Story not found' })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('updateStory error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to update story' })
    };
  }
};

export const deleteStory = async (event, context) => {
  try {
    const { id } = event.pathParameters;
    console.log(`deleteStory function called for ID: ${id}`);
    
    const result = await db.deleteStory(id);
    
    if (!result) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Story not found' })
      };
    }
    
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: ''
    };
  } catch (error) {
    console.error('deleteStory error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to delete story' })
    };
  }
};

export const healthCheck = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'healthy',
      service: 'aipm-microservices',
      timestamp: new Date().toISOString(),
      version: '3.0'
    })
  };
};
