#!/usr/bin/env node

import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import KiroQueueManager from './kiro-queue-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load contracts
const CONTRACTS = JSON.parse(
  readFileSync(join(__dirname, 'contracts/contracts.json'), 'utf-8')
);

console.log('📋 Loaded contracts:', Object.keys(CONTRACTS));

// Load prompt templates
const PROMPTS = {
  enhanceStory: readFileSync(join(__dirname, 'prompts/enhance-story-minimal.txt'), 'utf-8'),
  enhanceStoryJson: readFileSync(join(__dirname, 'prompts/enhance-story.json'), 'utf-8'),
  chat: readFileSync(join(__dirname, 'prompts/chat.txt'), 'utf-8'),
  transform: readFileSync(join(__dirname, 'prompts/transform.txt'), 'utf-8')
};

console.log('📝 Loaded prompt templates:', Object.keys(PROMPTS));

// Initialize Kiro Queue Manager
const kiroQueue = new KiroQueueManager();

// Connect log broadcaster
kiroQueue.setLogBroadcaster((message) => {
  console.log(message);
});

kiroQueue.start();

// Log function
function broadcastLog(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Callback storage for async responses
const pendingCallbacks = new Map();

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      service: 'kiro-api-server-v3',
      version: '3.0',
      architecture: 'json-contract',
      port: 8081,
      uptime: process.uptime(),
      activeRequests: kiroQueue.processing ? 1 : 0,
      queuedRequests: kiroQueue.queue.length,
      contracts: Object.keys(CONTRACTS),
      endpoints: [
        'POST /kiro/v3/transform (primary)',
        'POST /kiro/enhance-story (legacy → redirects to v3/transform)',
        'POST /kiro/chat',
        'POST /kiro/callback/:id',
        'POST /kiro/v3/cli-live-check',
        'POST /kiro/v3/queue/cleanup'
      ]
    }));
    return;
  }

  // CLI Live Check endpoint
  if (req.url === '/kiro/v3/cli-live-check' && req.method === 'POST') {
    const startTime = Date.now();
    try {
      broadcastLog('🔍 CLI Live Check requested');
      
      // Test basic CLI communication with simple echo
      const result = await kiroQueue.sendCommand('echo "live-check-test"');
      const duration = Date.now() - startTime;
      
      if (result.success && result.output && typeof result.output === 'string') {
        broadcastLog(`✅ CLI Live Check passed in ${duration}ms`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          cli_responsive: true,
          response_time_ms: duration,
          test_response: result.output ? result.output.substring(0, 100) : 'No output',
          output_type: typeof result.output,
          timestamp: new Date().toISOString()
        }));
      } else {
        broadcastLog(`❌ CLI Live Check failed: ${JSON.stringify(result)}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'unhealthy',
          cli_responsive: false,
          response_time_ms: duration,
          test_response: result.output,
          output_type: typeof result.output,
          error: 'CLI returned non-string or empty response',
          result: result,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      broadcastLog(`❌ CLI Live Check error: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        cli_responsive: false,
        response_time_ms: duration,
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
    return;
  }

  // Callback endpoint for Kiro CLI to POST results
  if (req.url.startsWith('/kiro/callback/') && req.method === 'POST') {
    const callbackId = req.url.split('/')[3];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        broadcastLog(`📨 Callback received: ${callbackId}`);
        
        const callback = pendingCallbacks.get(callbackId);
        if (callback) {
          callback.resolve(data);
          pendingCallbacks.delete(callbackId);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        broadcastLog(`❌ Callback error: ${error.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Legacy endpoint - return immediate mock response to prevent hanging
  if (req.url === '/kiro/enhance-story' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { idea, draft, parent } = JSON.parse(body);
        
        broadcastLog(`🔄 Legacy enhance-story request: ${idea.substring(0, 50)}...`);
        
        // Return immediate mock response to prevent frontend timeout
        const mockResponse = {
          title: idea.substring(0, 100) || 'Enhanced Story',
          description: `Enhanced: ${idea}`,
          asA: 'user',
          iWant: idea,
          soThat: 'achieve the goal',
          storyPoint: 3,
          enhanced: true,
          source: 'kiro-mock'
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockResponse));
        
      } catch (error) {
        broadcastLog(`❌ Legacy enhance-story error: ${error.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Simple chat endpoint for terminal
  if (req.url === '/kiro/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const startTime = Date.now();
      try {
        const { message, prompt } = JSON.parse(body);
        const text = message || prompt || '';
        
        if (!text) {
          throw new Error('No message provided');
        }
        
        broadcastLog(`💬 /kiro/chat: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        
        // Use external prompt template
        const chatPrompt = PROMPTS.chat.replace('{{USER_MESSAGE}}', text);
        
        // Send directly to Kiro CLI
        const result = await kiroQueue.sendCommand(chatPrompt);
        
        const duration = Date.now() - startTime;
        broadcastLog(`✅ Response in ${duration}ms: ${result.output ? result.output.substring(0, 100) : 'No output'}${result.output && result.output.length > 100 ? '...' : ''}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: result.success,
          message: result.output,
          output: result.output,
          error: result.error || null,
          duration
        }));
        
      } catch (error) {
        const duration = Date.now() - startTime;
        broadcastLog(`❌ /kiro/chat error after ${duration}ms: ${error.message}`);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message,
          duration
        }));
      }
    });
    return;
  }

  // Contract-based transformation endpoint with callback support
  if (req.url === '/kiro/v3/transform' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const startTime = Date.now();
      try {
        const { contractId, callbackId, inputJson } = JSON.parse(body);
        
        broadcastLog(`📥 /kiro/v3/transform: ${contractId} (callback: ${callbackId || 'auto'})`);
        broadcastLog(`📦 Input: ${JSON.stringify(inputJson).substring(0, 100)}...`);
        
        const contract = CONTRACTS[contractId];
        if (!contract) {
          throw new Error(`Unknown contract: ${contractId}`);
        }
        
        // Validate input
        validateSchema(inputJson, contract.inputSchema, 'input');
        broadcastLog(`✅ Input validation passed`);
        
        // Build callback-based prompt
        const finalCallbackId = callbackId || `transform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const callbackUrl = `http://44.220.45.57:3000/api/kiro/callback?id=${finalCallbackId}`;
        
        const prompt = buildSimpleTransformPrompt(contract, inputJson, callbackUrl);
        broadcastLog(`📝 Callback prompt: ${prompt.length} chars (ID: ${finalCallbackId})`);
        
        // Send to Kiro CLI for callback (fire and forget)
        broadcastLog(`📤 Sending callback prompt to Kiro CLI...`);
        
        // Fire and forget - don't wait for response
        kiroQueue.sendCommand(prompt).catch(err => {
          broadcastLog(`⚠️ Kiro CLI error: ${err.message}`);
        });
        
        // Return immediate success - response will come via callback
        const duration = Date.now() - startTime;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Request sent to Kiro CLI, response will come via callback',
          callbackId: finalCallbackId,
          _meta: {
            contractId,
            version: contract.version,
            duration,
            method: 'callback'
          }
        }));
        
      } catch (error) {
        const duration = Date.now() - startTime;
        broadcastLog(`❌ Transform failed after ${duration}ms: ${error.message}`);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message,
          _meta: { duration, method: 'callback' }
        }));
      }
    });
    return;
  }

  // Queue cleanup endpoint
  if (req.url === '/kiro/v3/queue/cleanup' && req.method === 'POST') {
    try {
      broadcastLog('🧹 Queue cleanup requested');
      
      const queueSize = kiroQueue.queue.length;
      const wasProcessing = kiroQueue.processing;
      
      // Clear the queue
      kiroQueue.queue.length = 0;
      
      // Clear pending callbacks
      const pendingCount = pendingCallbacks.size;
      for (const [callbackId, { reject }] of pendingCallbacks) {
        reject(new Error('Queue cleanup - request cancelled'));
      }
      pendingCallbacks.clear();
      
      // Reset processing state if needed
      if (kiroQueue.processing) {
        kiroQueue.processing = false;
      }
      
      broadcastLog(`✅ Queue cleanup completed: ${queueSize} queued items, ${pendingCount} pending callbacks cleared`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Queue cleanup completed',
        cleared: {
          queuedItems: queueSize,
          pendingCallbacks: pendingCount,
          wasProcessing: wasProcessing
        },
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      broadcastLog(`❌ Queue cleanup error: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false,
        error: error.message 
      }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

function buildDirectTransformPrompt(contract, inputJson) {
  // Simple, direct prompt that works with Kiro CLI
  return `Generate this JSON with enhanced fields: {"storyId":"${inputJson.storyId}","title":"${inputJson.title}","description":"${inputJson.description}","asA":"${inputJson.asA}","iWant":"${inputJson.iWant}","soThat":"${inputJson.soThat}","acceptanceCriteria":["System successfully implements ${inputJson.title.toLowerCase()}","User interface is intuitive and responsive","All edge cases are handled gracefully","Performance meets acceptable standards"],"enhanced":true,"enhancedAt":"${new Date().toISOString()}"}`;
}

function buildSimpleTransformPrompt(contract, inputJson, callbackUrl) {
  // Extract the main content based on contract type
  let mainContent = '';
  let actionType = 'transform';
  
  if (contract.description.includes('story')) {
    mainContent = inputJson.idea || inputJson.title || inputJson.description || 'story';
    actionType = 'enhance this user story';
  } else if (contract.description.includes('test')) {
    mainContent = inputJson.reason || inputJson.context || 'test case';
    actionType = 'generate acceptance test';
  } else if (contract.description.includes('invest')) {
    mainContent = inputJson.title || 'story';
    actionType = 'analyze INVEST criteria';
  } else if (contract.description.includes('code')) {
    // GitHub code generation workflow
    const { prompt, prNumber, branchName } = inputJson;
    return `I need you to implement this feature: "${prompt}"

This is for GitHub PR #${prNumber} on branch "${branchName}".

Please follow these steps:
1. Check out the branch: git checkout ${branchName}
2. Analyze the codebase to understand the current structure
3. Implement the requested feature with proper code
4. Test the implementation
5. Commit the changes with a descriptive message
6. Push to the branch: git push origin ${branchName}

After completing the implementation, execute this callback:
curl -X POST ${callbackUrl} -H "Content-Type: application/json" -d '{
  "files": [{"path": "example.js", "content": "// Generated code", "action": "create"}],
  "commitMessage": "Implement feature: ${prompt}",
  "committed": true,
  "prUrl": "https://github.com/demian7575/aipm/pull/${prNumber}",
  "summary": "Successfully implemented the requested feature"
}'

Working directory: /home/ec2-user/aipm
Make sure to work within this repository.`;
  }
  
  // Build simple, direct prompt (like enhance-story approach)
  return `${actionType.charAt(0).toUpperCase() + actionType.slice(1)}: "${mainContent}"

Create enhanced JSON matching this structure and then execute curl:
${JSON.stringify(contract.outputSchema, null, 2)}

Then immediately execute:
curl -X POST ${callbackUrl} -H "Content-Type: application/json" -d 'YOUR_ENHANCED_JSON_HERE'

Replace YOUR_ENHANCED_JSON_HERE with the actual JSON you created.`;
}

function buildTransformationPrompt(contract, inputJson) {
  const rules = contract.transformationRules
    .map((rule, i) => `${i + 1}. ${rule}`)
    .join('\n');
  
  return `You are a JSON transformation service.

INPUT JSON:
${JSON.stringify(inputJson, null, 2)}

TRANSFORMATION RULES:
${rules}

OUTPUT SCHEMA:
${JSON.stringify(contract.outputSchema, null, 2)}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON matching the output schema exactly
2. No markdown code blocks (no \`\`\`json)
3. No explanations, comments, or additional text
4. Start your response with { and end with }
5. All required fields from schema must be present
6. Field types must match schema exactly
7. Preserve all ID fields exactly as provided in input
8. Use current ISO8601 timestamp for any timestamp fields

Return the transformed JSON now:`;
}

function parseJsonResponse(output) {
  let jsonStr = output.trim();
  
  // Remove markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  
  // Find JSON boundaries
  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');
  
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('No JSON object found in response');
  }
  
  jsonStr = jsonStr.substring(startIdx, endIdx + 1);
  
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

function validateSchema(data, schema, label) {
  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        throw new Error(`${label}: Missing required field '${field}'`);
      }
    }
  }
  
  // Check types
  if (schema.properties) {
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      if (field in data) {
        const value = data[field];
        const expectedType = fieldSchema.type;
        
        if (expectedType === 'array' && !Array.isArray(value)) {
          throw new Error(`${label}: Field '${field}' should be array`);
        }
        if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value) || value === null)) {
          throw new Error(`${label}: Field '${field}' should be object`);
        }
        if (expectedType === 'string' && typeof value !== 'string') {
          throw new Error(`${label}: Field '${field}' should be string`);
        }
        if (expectedType === 'number' && typeof value !== 'number') {
          throw new Error(`${label}: Field '${field}' should be number`);
        }
        if (expectedType === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`${label}: Field '${field}' should be boolean`);
        }
        
        // Check array constraints
        if (expectedType === 'array' && fieldSchema.minItems && value.length < fieldSchema.minItems) {
          throw new Error(`${label}: Field '${field}' must have at least ${fieldSchema.minItems} items`);
        }
        if (expectedType === 'array' && fieldSchema.maxItems && value.length > fieldSchema.maxItems) {
          throw new Error(`${label}: Field '${field}' must have at most ${fieldSchema.maxItems} items`);
        }
      }
    }
  }
}

const PORT = process.env.KIRO_API_PORT || 8081;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Kiro API Server V3 (JSON Contract Architecture)`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`📋 Contracts: ${Object.keys(CONTRACTS).length}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Transform: POST http://localhost:${PORT}/kiro/v3/transform`);
  console.log(`🔗 Chat: POST http://localhost:${PORT}/kiro/chat`);
  console.log(`${'='.repeat(80)}\n`);
});
