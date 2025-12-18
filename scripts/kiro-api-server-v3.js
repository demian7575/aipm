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
  enhanceStory: readFileSync(join(__dirname, 'prompts/enhance-story.txt'), 'utf-8'),
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
        'POST /kiro/enhance-story',
        'POST /kiro/chat',
        'POST /kiro/v3/transform',
        'POST /kiro/callback/:id'
      ]
    }));
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

  // Legacy endpoint for Lambda compatibility
  if (req.url === '/kiro/enhance-story' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const startTime = Date.now();
      try {
        const { idea, draft, parent } = JSON.parse(body);
        
        broadcastLog(`📥 /kiro/enhance-story: ${idea?.substring(0, 50) || 'no idea'}...`);
        
        // Generate unique callback ID
        const callbackId = `enhance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const callbackUrl = `http://localhost:8081/kiro/callback/${callbackId}`;
        
        // Create promise for callback
        const callbackPromise = new Promise((resolve, reject) => {
          pendingCallbacks.set(callbackId, { resolve, reject });
          
          // Timeout after 15 minutes
          setTimeout(() => {
            if (pendingCallbacks.has(callbackId)) {
              pendingCallbacks.delete(callbackId);
              reject(new Error('Callback timeout'));
            }
          }, 900000); // 15 minutes
        });
        
        // Single step: Generate enhanced JSON AND execute curl
        const combinedPrompt = `Enhance this user story and then execute a curl command:

Idea: "${idea}"
Parent: ${parent?.title || 'None'}

First, create enhanced JSON in this format:
{"title":"enhanced title","description":"enhanced description","asA":"user role","iWant":"what they want","soThat":"business value","acceptanceCriteria":[{"id":1,"title":"criterion 1","description":"details"},{"id":2,"title":"criterion 2","description":"details"},{"id":3,"title":"criterion 3","description":"details"}]}

Then immediately execute this curl command with your enhanced JSON:
curl -X POST ${callbackUrl} -H "Content-Type: application/json" -d 'YOUR_ENHANCED_JSON_HERE'

Replace YOUR_ENHANCED_JSON_HERE with the actual JSON you created.`;
        
        broadcastLog(`📤 Single step: Generate JSON and execute curl...`);
        
        // Send combined command to Kiro CLI
        kiroQueue.sendCommand(combinedPrompt).catch(err => {
          broadcastLog(`⚠️ Kiro command error: ${err.message}`);
        });
        
        // Wait for callback
        try {
          const enhanced = await callbackPromise;
          const duration = Date.now() - startTime;
          broadcastLog(`✅ Enhanced via callback in ${duration}ms`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ...enhanced,
            source: 'kiro-enhanced',
            duration
          }));
        } catch (callbackError) {
          // Callback timeout - return empty
          const duration = Date.now() - startTime;
          broadcastLog(`⚠️ Callback timeout after ${duration}ms`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            source: 'kiro-timeout',
            duration
          }));
        }
        
      } catch (error) {
        const duration = Date.now() - startTime;
        broadcastLog(`❌ /kiro/enhance-story error: ${error.message}`);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: error.message,
          duration
        }));
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
        broadcastLog(`✅ Response in ${duration}ms: ${result.output.substring(0, 100)}${result.output.length > 100 ? '...' : ''}`);
        
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

  // Contract-based transformation endpoint
  if (req.url === '/kiro/v3/transform' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const startTime = Date.now();
      try {
        const { contractId, inputJson } = JSON.parse(body);
        
        broadcastLog(`📥 /kiro/v3/transform: ${contractId}`);
        broadcastLog(`📦 Input: ${JSON.stringify(inputJson).substring(0, 100)}...`);
        
        const contract = CONTRACTS[contractId];
        if (!contract) {
          throw new Error(`Unknown contract: ${contractId}`);
        }
        
        // Validate input
        validateSchema(inputJson, contract.inputSchema, 'input');
        broadcastLog(`✅ Input validation passed`);
        
        // Build transformation prompt
        const prompt = buildTransformationPrompt(contract, inputJson);
        broadcastLog(`📝 Prompt: ${prompt.length} chars`);
        
        // Send to Kiro CLI
        broadcastLog(`📤 Sending to Kiro CLI...`);
        const result = await kiroQueue.sendCommand(prompt);
        
        if (!result.success) {
          throw new Error(result.error || 'Kiro CLI failed');
        }
        
        broadcastLog(`📨 Received: ${result.output.length} chars`);
        
        // Parse and validate output
        const outputJson = parseJsonResponse(result.output);
        validateSchema(outputJson, contract.outputSchema, 'output');
        broadcastLog(`✅ Output validation passed`);
        
        const duration = Date.now() - startTime;
        broadcastLog(`✅ Transform completed in ${duration}ms`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          outputJson,
          _meta: {
            contractId,
            version: contract.version,
            duration
          }
        }));
        
      } catch (error) {
        const duration = Date.now() - startTime;
        broadcastLog(`❌ Transform failed after ${duration}ms: ${error.message}`);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message,
          _meta: { duration }
        }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

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
