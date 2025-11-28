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
  
  // Amazon Q / CodeWhisperer code generation endpoint
  expressApp.post(['/api/generate-code', '/prod/api/generate-code', '/dev/api/generate-code'], async (req, res) => {
    const { taskDescription } = req.body;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'demian7575';
    const GITHUB_REPO = process.env.GITHUB_REPO || 'aipm';
    const REPO_FULL = `${GITHUB_OWNER}/${GITHUB_REPO}`;
    
    if (!GITHUB_TOKEN) {
      return res.json({
        success: false,
        message: "GITHUB_TOKEN not configured"
      });
    }
    
    try {
      const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
      const client = new BedrockRuntimeClient({ region: "us-east-1" });
      
      const prompt = `Generate code for this task: ${taskDescription}

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.

Required JSON format:
{
  "files": [
    {
      "path": "filename.js",
      "content": "// code content here"
    }
  ],
  "summary": "Brief description of changes"
}

Rules:
- Use double quotes for all strings
- Escape special characters in content
- No backticks in JSON
- Return ONLY the JSON object`;
      
      const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }]
        })
      });
      
      const response = await client.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));
      const text = result.content[0].text;
      
      // Remove markdown code blocks if present
      let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Find JSON object
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.json({ 
          success: false, 
          message: "AI did not return valid JSON", 
          details: text.substring(0, 200) 
        });
      }
      
      let codeData;
      try {
        codeData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        return res.json({ 
          success: false, 
          message: "Failed to parse AI response: " + parseError.message,
          details: jsonMatch[0].substring(0, 200)
        });
      }
      
      if (!codeData.files || !Array.isArray(codeData.files)) {
        return res.json({ 
          success: false, 
          message: "AI response missing 'files' array",
          details: JSON.stringify(codeData)
        });
      }
      const https = require('https');
      const branchName = `amazonq/${Date.now()}`;
      
      // Get develop branch SHA
      const getRef = () => new Promise((resolve, reject) => {
        https.get({
          hostname: 'api.github.com',
          path: `/repos/${REPO_FULL}/git/ref/heads/develop`,
          headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'AIPM' }
        }, (r) => {
          let d = '';
          r.on('data', c => d += c);
          r.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
      });
      
      const baseSha = (await getRef()).object.sha;
      
      // Create branch
      await new Promise((resolve, reject) => {
        const data = JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha });
        const req = https.request({
          hostname: 'api.github.com',
          path: `/repos/${REPO_FULL}/git/refs`,
          method: 'POST',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'AIPM',
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        }, resolve);
        req.on('error', reject);
        req.write(data);
        req.end();
      });
      
      // Create files
      for (const file of codeData.files) {
        const content = Buffer.from(file.content).toString('base64');
        const data = JSON.stringify({
          message: `Amazon Q: ${taskDescription}`,
          content,
          branch: branchName
        });
        
        await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: 'api.github.com',
            path: `/repos/${REPO_FULL}/contents/${file.path}`,
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'User-Agent': 'AIPM',
              'Content-Type': 'application/json',
              'Content-Length': data.length
            }
          }, resolve);
          req.on('error', reject);
          req.write(data);
          req.end();
        });
      }
      
      // Create PR
      const prTitle = `🤖 Amazon Q: ${taskDescription}`;
      const prBody = `## Amazon Q Generated Code\n\n**Task:** ${taskDescription}\n\n**Summary:** ${codeData.summary || 'Code generated'}\n\n### ⚠️ Review Required\n- [ ] Test changes\n- [ ] Update if needed`;
      
      const prPayload = {
        title: prTitle,
        body: prBody,
        head: `${GITHUB_OWNER}:${branchName}`,
        base: 'develop'
      };
      
      const prData = JSON.stringify(prPayload);
      console.log('Creating PR with payload:', prPayload);
      
      const prReq = https.request({
        hostname: 'api.github.com',
        path: `/repos/${REPO_FULL}/pulls`,
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'User-Agent': 'AIPM',
          'Content-Type': 'application/json',
          'Content-Length': prData.length
        }
      }, (prResp) => {
        let prBody = '';
        prResp.on('data', c => prBody += c);
        prResp.on('end', () => {
          console.log('PR Response Status:', prResp.statusCode);
          console.log('PR Response Body:', prBody);
          
          try {
            const pr = JSON.parse(prBody);
            if (pr.html_url) {
              res.json({
                success: true,
                message: "Code generated and PR created",
                prUrl: pr.html_url,
                prNumber: pr.number
              });
            } else {
              res.json({
                success: false,
                message: "PR creation failed: " + (pr.message || "Unknown error"),
                details: prBody.substring(0, 200)
              });
            }
          } catch (e) {
            res.json({
              success: false,
              message: "Failed to parse PR response: " + e.message,
              details: prBody.substring(0, 200)
            });
          }
        });
      });
      
      prReq.on('error', (error) => {
        res.json({ success: false, message: `PR failed: ${error.message}` });
      });
      
      prReq.write(prData);
      prReq.end();
      
    } catch (error) {
      console.error('Generation error:', error);
      res.json({ success: false, message: error.message });
    }
  });

  expressApp.post(['/api/run-staging', '/prod/api/run-staging', '/dev/api/run-staging'], async (req, res) => {
    const { taskTitle } = req.body;
    
    // Trigger GitHub Actions workflow
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'demian7575';
    const GITHUB_REPO = process.env.GITHUB_REPO || 'aipm';
    const REPO_FULL = `${GITHUB_OWNER}/${GITHUB_REPO}`;
    
    if (!GITHUB_TOKEN) {
      return res.json({
        success: true,
        message: "Staging endpoint ready (set GITHUB_TOKEN env var to enable auto-deployment)",
        deploymentUrl: "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/",
        branch: "develop",
        githubUrl: `https://github.com/${REPO_FULL}/tree/develop`
      });
    }
    
    try {
      const https = require('https');
      const data = JSON.stringify({
        ref: 'main',
        inputs: { 
          task_title: taskTitle || 'API triggered deployment'
        }
      });
      
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${REPO_FULL}/actions/workflows/deploy-staging.yml/dispatches`,
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'User-Agent': 'AIPM-Backend',
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };
      
      const request = https.request(options, (response) => {
        let responseBody = '';
        
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        
        response.on('end', () => {
          console.log('GitHub API Response:', {
            statusCode: response.statusCode,
            headers: response.headers,
            body: responseBody,
            requestData: data,
            requestPath: options.path
          });
          
          if (response.statusCode === 204) {
            res.json({
              success: true,
              message: "Staging deployment triggered via GitHub Actions",
              deploymentUrl: "http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/",
              branch: "develop",
              githubUrl: `https://github.com/${REPO_FULL}/actions`
            });
          } else {
            res.json({
              success: false,
              message: `GitHub Actions trigger failed: ${response.statusCode}`,
              details: responseBody,
              repo: REPO_FULL,
              workflow: 'deploy-staging.yml'
            });
          }
        });
      });
      
      request.on('error', (error) => {
        console.error('GitHub API Error:', error);
        res.json({
          success: false,
          message: `GitHub Actions error: ${error.message}`
        });
      });
      
      request.write(data);
      request.end();
    } catch (error) {
      console.error('Deployment trigger error:', error);
      res.json({
        success: false,
        message: `Deployment trigger failed: ${error.message}`
      });
    }
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
