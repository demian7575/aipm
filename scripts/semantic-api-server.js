#!/usr/bin/env node
import http from 'http';
import { existsSync, readFile } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '../templates');
const PORT = process.env.SEMANTIC_API_PORT || 8082;
const QUEUE_TABLE = process.env.SEMANTIC_QUEUE_TABLE || 'aipm-semantic-api-queue';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

// Store pending requests waiting for callback
const pendingRequests = new Map();

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
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
    res.end(JSON.stringify({ 
      status: 'healthy',
      pendingRequests: pendingRequests.size,
      queueTable: QUEUE_TABLE
    }));
    return;
  }

  // Callback endpoint for Kiro CLI to post results
  if (url.pathname.startsWith('/callback/') && req.method === 'POST') {
    const taskId = url.pathname.split('/').pop();
    console.log(`📥 Callback received for task: ${taskId}`);

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const result = JSON.parse(body);
        
        // Update task in DynamoDB
        await dynamodb.send(new UpdateCommand({
          TableName: QUEUE_TABLE,
          Key: { id: taskId },
          UpdateExpression: 'SET #status = :complete, #result = :result, completedAt = :completedAt',
          ExpressionAttributeNames: { 
            '#status': 'status', 
            '#result': 'result' 
          },
          ExpressionAttributeValues: { 
            ':complete': 'complete', 
            ':result': JSON.stringify(result),
            ':completedAt': Date.now()
          }
        }));

        // Resolve pending request if exists
        if (pendingRequests.has(taskId)) {
          console.log(`✅ Resolving pending request for ${taskId}`);
          const { res: pendingRes } = pendingRequests.get(taskId);
          pendingRes.writeHead(200, { 'Content-Type': 'application/json' });
          pendingRes.end(JSON.stringify(result));
          pendingRequests.delete(taskId);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error(`❌ Callback error:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Get task result
  if (url.pathname.startsWith('/task/') && req.method === 'GET') {
    const taskId = url.pathname.split('/').pop();
    try {
      const result = await dynamodb.send(new GetCommand({
        TableName: QUEUE_TABLE,
        Key: { id: taskId }
      }));

      if (!result.Item) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Task not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.Item));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Generic template-based endpoint
  // Map: METHOD /path/to/endpoint → templates/METHOD-path-to-endpoint.md
  const templateName = `${req.method}${url.pathname.replace(/\//g, '-')}.md`;
  const templatePath = join(TEMPLATES_DIR, templateName);

  console.log(`📝 Request: ${req.method} ${url.pathname}`);
  console.log(`📄 Template: ${templateName}`);

  if (!existsSync(templatePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Template not found',
      template: templateName,
      path: url.pathname
    }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const parameters = body ? JSON.parse(body) : Object.fromEntries(url.searchParams);
      console.log(`📊 Parameters:`, parameters);

      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const task = {
        id: taskId,
        status: 'pending',
        createdAt: Date.now(),
        input: {
          template: templatePath,
          parameters
        }
      };

      await dynamodb.send(new PutCommand({
        TableName: QUEUE_TABLE,
        Item: task
      }));

      console.log(`✨ Task created: ${taskId}, waiting for callback...`);
      
      // Store pending request - callback will resolve it
      pendingRequests.set(taskId, { res, createdAt: Date.now() });

      // Timeout after 90 seconds
      setTimeout(() => {
        if (pendingRequests.has(taskId)) {
          pendingRequests.delete(taskId);
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            taskId, 
            status: 'timeout', 
            message: 'Processing timeout, check /task/' + taskId 
          }));
        }
      }, 90000);

    } catch (error) {
      console.error(`❌ Error:`, error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Semantic API server running on port ${PORT}`);
  console.log(`📁 Templates directory: ${TEMPLATES_DIR}`);
  console.log(`🗄️  Queue table: ${QUEUE_TABLE}`);
  console.log(`📋 Template mapping: METHOD /path → templates/METHOD-path.md`);
});
