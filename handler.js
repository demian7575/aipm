const serverlessExpress = require('@vendia/serverless-express');
const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = process.env.STORIES_TABLE;

let app;

// Build hierarchical story structure
function buildStoryHierarchy(flatStories) {
  const storyMap = new Map();
  const rootStories = [];
  
  // First pass: create map of all stories
  flatStories.forEach(story => {
    storyMap.set(story.id, { ...story, children: [] });
  });
  
  // Second pass: build hierarchy
  storyMap.forEach(story => {
    if (story.parentId && storyMap.has(story.parentId)) {
      // Add to parent's children
      const parent = storyMap.get(story.parentId);
      parent.children.push(story);
    } else {
      // Root story (no parent, parent doesn't exist, or parent is invalid)
      // Treat orphaned stories as root stories
      rootStories.push(story);
    }
  });
  
  return rootStories;
}

// Create Express app
function createApp() {
  const expressApp = express();
  
  expressApp.use(express.json());
  
  // CORS middleware
  expressApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent');
    res.header('Access-Control-Allow-Methods', 'OPTIONS,DELETE,GET,HEAD,PATCH,POST,PUT');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });
  
  // Get all stories from DynamoDB with proper hierarchy
  expressApp.get(['/api/stories', '/prod/api/stories', '/dev/api/stories'], async (req, res) => {
    try {
      const command = new ScanCommand({
        TableName: STORIES_TABLE
      });
      
      const result = await docClient.send(command);
      const items = result.Items || [];
      
      // Transform and filter out non-story items
      const stories = items
        .filter(item => item.title !== undefined || item.description !== undefined)
        .map(item => ({
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          status: item.status || 'Draft',
          parentId: item.parentId || null,
          asA: item.asA || '',
          iWant: item.iWant || '',
          soThat: item.soThat || '',
          storyPoint: item.storyPoint || 0,
          assigneeEmail: item.assigneeEmail || '',
          components: item.components || '[]',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          acceptanceTests: [],
          referenceDocuments: [],
          tasks: [],
          dependencies: [],
          blockedBy: [],
          blocking: []
        }));
      
      // Build hierarchical structure
      const hierarchicalStories = buildStoryHierarchy(stories);
      
      res.json(hierarchicalStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      res.status(500).json({ error: 'Failed to fetch stories', message: error.message });
    }
  });
  
  expressApp.get(['/api/stories/draft', '/prod/api/stories/draft', '/dev/api/stories/draft'], (req, res) => {
    res.json({
      id: Date.now(),
      title: "Generated Story",
      description: "This is a generated test story"
    });
  });
  
  expressApp.post(['/api/stories/draft', '/prod/api/stories/draft', '/dev/api/stories/draft'], (req, res) => {
    const { idea, parentId } = req.body || {};
    res.json({
      id: Date.now(),
      title: idea ? `Story: ${idea}` : "Generated Story",
      description: idea ? `As a user, I want to ${idea}` : "This is a generated test story",
      asA: "User",
      iWant: idea || "implement a feature",
      soThat: "I can accomplish my goals",
      status: "Draft",
      parentId: parentId || null
    });
  });
  
  expressApp.post(['/api/run-staging', '/prod/api/run-staging', '/dev/api/run-staging'], (req, res) => {
    res.json({
      success: true,
      message: "Staging workflow completed successfully"
    });
  });
  
  // Catch-all route
  expressApp.use((req, res) => {
    res.json({ message: 'AIPM API is working', path: req.path });
  });
  
  return expressApp;
}

exports.handler = async (event, context) => {
  if (!app) {
    app = createApp();
  }
  
  const serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
};
