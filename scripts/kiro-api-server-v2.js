#!/usr/bin/env node

import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import KiroQueueManager from './kiro-queue-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load prompt templates
const PROMPT_TEMPLATES = JSON.parse(
  readFileSync(join(__dirname, 'prompts/templates.json'), 'utf-8')
);

console.log('📚 Loaded prompt templates:', Object.keys(PROMPT_TEMPLATES));

// Initialize Kiro Queue Manager
const kiroQueue = new KiroQueueManager();
kiroQueue.start();

const server = http.createServer(async (req, res) => {
  // CORS headers
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
      service: 'kiro-api-server-v2',
      version: '2.0',
      port: 8081,
      uptime: process.uptime(),
      activeRequests: kiroQueue.processing ? 1 : 0,
      queuedRequests: kiroQueue.queue.length,
      maxConcurrent: 1,
      templates: Object.keys(PROMPT_TEMPLATES),
      endpoints: [
        'POST /kiro/v2/enhance-story',
        'POST /kiro/v2/generate-acceptance-test', 
        'POST /kiro/v2/analyze-invest',
        'POST /kiro/v2/chat'
      ]
    }));
    return;
  }

  // V2 API with structured protocol
  if (req.url.startsWith('/kiro/v2/') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const startTime = Date.now();
      try {
        const payload = JSON.parse(body);
        const endpoint = req.url.split('/')[3]; // extract endpoint name after /kiro/v2/
        
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📥 [${new Date().toISOString()}] V2 Request: ${endpoint}`);
        console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
        
        // Build structured request
        const templateName = `${endpoint}-v1`;
        const template = PROMPT_TEMPLATES[templateName];
        
        if (!template) {
          throw new Error(`Unknown template: ${templateName}`);
        }
        
        console.log(`📋 Using template: ${templateName} (v${template.version})`);
        
        // Render prompt with data
        const renderedPrompt = renderPrompt(template.instruction, payload);
        console.log(`📝 Rendered prompt (${renderedPrompt.length} chars):`);
        console.log(renderedPrompt.substring(0, 200) + '...');
        
        // Add strict JSON instruction
        const fullPrompt = `You are a structured API. Respond with ONLY valid JSON.

${renderedPrompt}

Expected Output Schema:
${JSON.stringify(template.outputSchema, null, 2)}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON matching the schema above
2. No markdown code blocks (no \`\`\`json)
3. No explanations or additional text
4. Start your response with { and end with }
5. Ensure all required fields are present
`;
        
        console.log(`📤 Sending to Kiro CLI (${fullPrompt.length} chars total)`);
        
        // Send to Kiro CLI
        const result = await kiroQueue.sendCommand(fullPrompt);
        
        console.log(`📨 Kiro CLI response (success: ${result.success}):`);
        console.log(`   Output length: ${result.output.length} chars`);
        console.log(`   Output preview: ${result.output.substring(0, 200)}...`);
        
        if (!result.success) {
          throw new Error(result.error || 'Kiro CLI returned failure');
        }
        
        // Parse JSON response
        const response = parseKiroResponse(result.output, template.outputSchema);
        
        const duration = Date.now() - startTime;
        console.log(`✅ Success! Parsed response in ${duration}ms`);
        console.log(`📊 Response fields:`, Object.keys(response));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ...response,
          _meta: {
            endpoint,
            template: templateName,
            version: template.version,
            duration,
            source: 'kiro-v2'
          }
        }));
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Error after ${duration}ms:`, error.message);
        console.error(`   Stack:`, error.stack);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: error.message, 
          success: false,
          _meta: {
            duration,
            source: 'kiro-v2-error'
          }
        }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found. Use /kiro/v2/<endpoint>' }));
});

// Template renderer with {{data.field}} syntax
function renderPrompt(template, data) {
  let rendered = template;
  
  // Replace {{data.field}} with actual values
  rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path.trim());
    
    if (value === undefined || value === null) {
      return 'None';
    }
    
    if (Array.isArray(value)) {
      return value.join(', ') || 'None';
    }
    
    return String(value);
  });
  
  return rendered;
}

function getNestedValue(obj, path) {
  // Handle paths like "data.draft.title"
  const parts = path.split('.');
  let current = { data: obj };
  
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  
  return current;
}

// Generic JSON parser with validation
function parseKiroResponse(output, schema) {
  console.log(`🔍 Parsing Kiro response...`);
  
  let jsonStr = output.trim();
  
  // Remove markdown code blocks if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    console.log(`   ⚠️  Found markdown code block, extracting...`);
    jsonStr = codeBlockMatch[1].trim();
  }
  
  // Find JSON object boundaries
  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');
  
  if (startIdx === -1 || endIdx === -1) {
    console.error(`   ❌ No JSON object found in output`);
    throw new Error('No JSON object found in response');
  }
  
  if (startIdx > 0) {
    console.log(`   ⚠️  Skipping ${startIdx} chars before JSON`);
  }
  
  jsonStr = jsonStr.substring(startIdx, endIdx + 1);
  console.log(`   📏 Extracted JSON: ${jsonStr.length} chars`);
  
  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
    console.log(`   ✅ JSON parsed successfully`);
  } catch (error) {
    console.error(`   ❌ JSON parse error:`, error.message);
    console.error(`   📄 Attempted to parse:`, jsonStr.substring(0, 500));
    throw new Error(`Invalid JSON: ${error.message}`);
  }
  
  // Validate against schema
  try {
    validateSchema(parsed, schema);
    console.log(`   ✅ Schema validation passed`);
  } catch (error) {
    console.error(`   ❌ Schema validation failed:`, error.message);
    throw error;
  }
  
  return {
    ...parsed,
    success: true
  };
}

function validateSchema(data, schema) {
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
  
  // Validate types for required fields
  if (schema.properties) {
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      if (field in data) {
        const value = data[field];
        const expectedType = fieldSchema.type;
        
        if (expectedType === 'array' && !Array.isArray(value)) {
          throw new Error(`Field '${field}' should be array, got ${typeof value}`);
        }
        if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
          throw new Error(`Field '${field}' should be object, got ${typeof value}`);
        }
        if (expectedType === 'string' && typeof value !== 'string') {
          throw new Error(`Field '${field}' should be string, got ${typeof value}`);
        }
        if (expectedType === 'number' && typeof value !== 'number') {
          throw new Error(`Field '${field}' should be number, got ${typeof value}`);
        }
      }
    }
  }
  
  return true;
}

const PORT = process.env.KIRO_API_PORT || 8081;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Kiro API Server V2 running on port ${PORT}`);
  console.log(`📚 Loaded ${Object.keys(PROMPT_TEMPLATES).length} prompt templates`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 Endpoints:`);
  console.log(`   POST /kiro/v2/enhance-story`);
  console.log(`   POST /kiro/v2/generate-acceptance-test`);
  console.log(`   POST /kiro/v2/analyze-invest`);
  console.log(`   POST /kiro/v2/chat`);
  console.log(`${'='.repeat(80)}\n`);
});
