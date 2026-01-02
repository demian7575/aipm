#!/usr/bin/env node

import http from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Environment validation
const requiredEnvVars = ['KIRO_API_PORT', 'KIRO_CLI_PATH'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`❌ FATAL: Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// DynamoDB setup
const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);
const STORIES_TABLE = 'aipm-backend-prod-stories';

// Kiro CLI process
let kiroProcess = null;

function startKiroProcess() {
  if (kiroProcess) return;
  
  const kiroPath = process.env.KIRO_CLI_PATH;
  kiroProcess = spawn(kiroPath, ['chat', '--trust-all-tools'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: '/home/ec2-user/aipm'
  });
  
  kiroProcess.on('close', () => {
    kiroProcess = null;
    setTimeout(startKiroProcess, 1000);
  });
}

async function sendToKiro(prompt) {
  if (!kiroProcess) startKiroProcess();
  
  return new Promise((resolve, reject) => {
    let responseBuffer = '';
    
    const onData = (chunk) => {
      responseBuffer += chunk.toString();
      if (responseBuffer.includes('success') || responseBuffer.includes('completed')) {
        kiroProcess.stdout.removeListener('data', onData);
        resolve(responseBuffer);
      }
    };
    
    kiroProcess.stdout.on('data', onData);
    kiroProcess.stdin.write(prompt + '\n');
    
    setTimeout(() => {
      kiroProcess.stdout.removeListener('data', onData);
      reject(new Error('Timeout'));
    }, 60000);
  });
}

// DynamoDB helpers
async function getStories() {
  const { Items } = await dynamodb.send(new ScanCommand({ TableName: STORIES_TABLE }));
  return buildHierarchy(Items || []);
}

function buildHierarchy(flatStories) {
  const storyMap = new Map();
  const rootStories = [];
  
  flatStories.forEach(story => {
    story.children = [];
    storyMap.set(story.id, story);
  });
  
  flatStories.forEach(story => {
    if (story.parentId && storyMap.has(story.parentId)) {
      storyMap.get(story.parentId).children.push(story);
    } else {
      rootStories.push(story);
    }
  });
  
  return rootStories;
}

async function createStory(story) {
  await dynamodb.send(new PutCommand({
    TableName: STORIES_TABLE,
    Item: {
      ...story,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }));
  return story;
}

// HTTP server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Get stories
  if (url.pathname === '/api/stories' && req.method === 'GET') {
    try {
      const stories = await getStories();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stories));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Create story
  if (url.pathname === '/api/stories' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const story = JSON.parse(body);
        story.id = Date.now();
        const createdStory = await createStory(story);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(createdStory));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Generate draft
  if (url.pathname === '/api/generate-draft' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { feature_description } = JSON.parse(body);
        
        // Load template and create prompt
        const template = readFileSync('./templates/user-story-generation.md', 'utf8');
        const prompt = `${template}

Input data:
feature_description: ${feature_description}

Generate the story data and return it as JSON with fields: title, description, asA, iWant, soThat, storyPoint, status, components`;
        
        const result = await sendToKiro(prompt);
        
        // Try to extract JSON from Kiro response
        let draft = null;
        try {
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            draft = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          // Fallback if JSON parsing fails
          draft = {
            title: feature_description,
            description: `As a user, I want ${feature_description} so that I can achieve my goals`,
            asA: 'user',
            iWant: feature_description,
            soThat: 'I can achieve my goals',
            storyPoint: 3,
            status: 'Draft',
            components: ['System']
          };
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          draft: draft,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // 404 for other endpoints
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

startKiroProcess();

const PORT = process.env.KIRO_API_PORT;
server.listen(PORT, () => {
  console.log(`🚀 Kiro API Server - Port: ${PORT}`);
});
