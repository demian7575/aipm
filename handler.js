import fs from 'fs';
import path from 'path';

// Simple in-memory database for Lambda
let stories = [];
let initialized = false;

// Initialize with seed data
function initializeData() {
  if (initialized) return;
  
  const timestamp = new Date().toISOString();
  
  // Seed data matching the original app
  stories = [
    {
      id: 1,
      parentId: null,
      title: 'Root',
      description: 'Seeds the workspace with an AI Project Manager baseline story focused on AIPM component coverage.',
      asA: 'AI project manager',
      iWant: 'coordinate autonomous planning across AIPM components',
      soThat: 'teams can deliver measurable outcomes with shared context',
      components: ['WorkModel', 'Orchestration_Engagement'],
      storyPoint: 5,
      assigneeEmail: 'owner@example.com',
      status: 'Ready',
      createdAt: timestamp,
      updatedAt: timestamp,
      children: []
    }
  ];
  
  initialized = true;
}

// Helper function to attach children to stories
function attachChildren(storiesArray) {
  const byId = new Map();
  storiesArray.forEach((story) => {
    story.children = [];
    byId.set(story.id, story);
  });
  
  const roots = [];
  storiesArray.forEach((story) => {
    if (story.parentId && byId.has(story.parentId)) {
      byId.get(story.parentId).children.push(story);
    } else {
      roots.push(story);
    }
  });
  
  return { roots, byId };
}

// Main Lambda handler
export const handler = async (event, context) => {
  try {
    console.log('AIPM Lambda handler called:', JSON.stringify(event, null, 2));
    
    // Initialize data
    initializeData();
    
    // Set up environment for Lambda
    process.env.AIPM_DATA_DIR = '/tmp/aipm/data';
    process.env.AIPM_UPLOAD_DIR = '/tmp/aipm/uploads';
    process.env.NODE_ENV = 'production';
    
    // Parse the request
    const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const requestPath = event.path || event.rawPath || '/';
    
    console.log(`Processing ${httpMethod} ${requestPath}`);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }
    
    // API Routes
    if (requestPath === '/' || requestPath === '/prod' || requestPath === '/prod/') {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'AIPM API Server',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          endpoints: {
            health: '/health',
            stories: '/api/stories',
            story: '/api/stories/:id'
          }
        })
      };
    }
    
    if (requestPath === '/health' || requestPath === '/api/health') {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: 'lambda',
          version: '1.0.0',
          storiesCount: stories.length
        })
      };
    }
    
    if (requestPath === '/api/stories' && httpMethod === 'GET') {
      const { roots } = attachChildren([...stories]);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(roots)
      };
    }
    
    // Handle individual story requests
    const storyMatch = requestPath.match(/^\/api\/stories\/(\d+)$/);
    if (storyMatch && httpMethod === 'GET') {
      const storyId = parseInt(storyMatch[1]);
      const story = stories.find(s => s.id === storyId);
      
      if (!story) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Story not found',
            message: `Story with id ${storyId} not found`
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Handle story draft generation
    if (requestPath === '/api/stories/draft' && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { idea, parentId } = body;
      
      // Simple draft generation based on the idea
      const draft = {
        title: idea || 'New Story',
        description: `Generated story based on: ${idea || 'user input'}`,
        asA: 'user',
        iWant: idea || 'accomplish a task',
        soThat: 'I can achieve my goals',
        components: [],
        storyPoint: 3
      };
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      };
    }
    
    // Handle story creation
    if (requestPath === '/api/stories' && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const timestamp = new Date().toISOString();
      const newId = Math.max(...stories.map(s => s.id), 0) + 1;
      
      const newStory = {
        id: newId,
        parentId: body.parentId || null,
        title: body.title || 'New Story',
        description: body.description || '',
        asA: body.asA || '',
        iWant: body.iWant || '',
        soThat: body.soThat || '',
        components: body.components || [],
        storyPoint: body.storyPoint || 0,
        assigneeEmail: body.assigneeEmail || '',
        status: body.status || 'Draft',
        createdAt: timestamp,
        updatedAt: timestamp,
        children: []
      };
      
      stories.push(newStory);
      
      return {
        statusCode: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: newStory,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Default 404 response
    return {
      statusCode: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Not Found',
        message: `Path ${requestPath} not found`,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
