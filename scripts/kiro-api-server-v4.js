#!/usr/bin/env node

import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load contracts
const CONTRACTS = JSON.parse(
  readFileSync(join(__dirname, 'contracts/contracts.json'), 'utf-8')
);

console.log('📋 Loaded contracts:', Object.keys(CONTRACTS));

// Kiro CLI process
let kiroProcess = null;

function startKiroProcess() {
  if (kiroProcess) return;
  
  console.log('🚀 Starting Kiro CLI process...');
  const kiroPath = process.env.KIRO_CLI_PATH || '/home/ec2-user/.local/bin/kiro-cli';
  
  kiroProcess = spawn(kiroPath, ['chat', '--trust-all-tools'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  kiroProcess.on('close', () => {
    console.log('Kiro process closed, restarting...');
    kiroProcess = null;
    setTimeout(startKiroProcess, 1000);
  });
}

function sendToKiro(prompt) {
  return new Promise((resolve, reject) => {
    if (!kiroProcess) {
      reject(new Error('Kiro CLI process not available'));
      return;
    }
    
    const timeout = setTimeout(() => {
      reject(new Error('Kiro CLI timeout'));
    }, 30000); // 30 second timeout
    
    console.log('📤 Sending prompt to Kiro CLI:');
    console.log('=' .repeat(50));
    console.log(prompt);
    console.log('=' .repeat(50));
    
    // Add stdout/stderr listeners to see Kiro CLI responses
    kiroProcess.stdout.on('data', (data) => {
      console.log('📥 Kiro CLI stdout:', data.toString().trim());
    });
    
    kiroProcess.stderr.on('data', (data) => {
      console.log('⚠️ Kiro CLI stderr:', data.toString().trim());
    });
    
    kiroProcess.stdin.write(prompt + '\n');
    console.log('✅ Prompt sent to Kiro CLI stdin');
    
    // Return immediately - Kiro will POST to callback
    clearTimeout(timeout);
    resolve({ success: true, message: 'Prompt sent to Kiro CLI' });
  });
}

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
      service: 'kiro-api-server-v4',
      version: '4.0',
      architecture: 'direct-post',
      contracts: Object.keys(CONTRACTS),
      kiroProcess: kiroProcess ? 'running' : 'stopped'
    }));
    return;
  }

  if (req.url === '/kiro/v4/enhance-direct' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { idea, parentId } = JSON.parse(body);
        
        if (!idea) {
          throw new Error('Missing required field: idea');
        }
        
        console.log(`📥 Direct enhancement request: ${idea.substring(0, 50)}...`);
        
        // Get contract schema
        const contract = CONTRACTS['enhance-story-v1'];
        if (!contract) {
          throw new Error('enhance-story-v1 contract not found');
        }
        
        // Build simple prompt that returns JSON directly
        const prompt = `Generate enhanced user story JSON for: "${idea}"

Return ONLY a valid JSON object with this structure:
{
  "storyId": "story-" + timestamp,
  "title": "Enhanced title",
  "description": "Detailed description", 
  "asA": "user role",
  "iWant": "specific functionality",
  "soThat": "business value",
  "acceptanceCriteria": ["criterion 1", "criterion 2", "criterion 3"],
  "enhanced": true,
  "enhancedAt": "ISO timestamp"
}

No additional text, just the JSON object.`;
        
        // Send to Kiro CLI and get response
        const result = await sendToKiroDirect(prompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        
      } catch (error) {
        console.error(`❌ Direct enhancement error: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message
        }));
      }
    });
    return;
  }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { idea } = JSON.parse(body);
        
        if (!idea) {
          throw new Error('Missing required field: idea');
        }
        
        console.log(`📥 Synchronous enhancement request: ${idea.substring(0, 50)}...`);
        
  if (req.url === '/kiro/v4/enhance-direct' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { idea, parentId } = JSON.parse(body);
        
        if (!idea) {
          throw new Error('Missing required field: idea');
        }
        
        console.log(`📥 Direct enhancement request: ${idea.substring(0, 50)}...`);
        
        // Get contract schema
        const contract = CONTRACTS['enhance-story-v1'];
        if (!contract) {
          throw new Error('enhance-story-v1 contract not found');
        }
        
        // Build simple prompt that returns JSON directly
        const prompt = `Generate enhanced user story JSON for: "${idea}"

Return ONLY a valid JSON object with this structure:
{
  "storyId": "story-" + timestamp,
  "title": "Enhanced title",
  "description": "Detailed description", 
  "asA": "user role",
  "iWant": "specific functionality",
  "soThat": "business value",
  "acceptanceCriteria": ["criterion 1", "criterion 2", "criterion 3"],
  "enhanced": true,
  "enhancedAt": "ISO timestamp"
}

No additional text, just the JSON object.`;
        
        // Send to Kiro CLI and get response
        const result = await sendToKiroDirect(prompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        
      } catch (error) {
        console.error(`❌ Direct enhancement error: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message
        }));
      }
    });
    return;
  }

  if (req.url === '/kiro/v4/enhance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { idea, callbackUrl } = JSON.parse(body);
        
        if (!idea || !callbackUrl) {
          throw new Error('Missing required fields: idea, callbackUrl');
        }
        
        console.log(`📥 Enhancement request: ${idea.substring(0, 50)}...`);
        console.log(`📞 Callback URL: ${callbackUrl}`);
        
        // Get contract schema
        const contract = CONTRACTS['enhance-story-v1'];
        if (!contract) {
          throw new Error('enhance-story-v1 contract not found');
        }
        
        // Build prompt with contract schema
        const prompt = buildEnhancePrompt(idea, callbackUrl, contract.outputSchema);
        
        // Send to Kiro CLI
        await sendToKiro(prompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Enhancement request sent to Kiro CLI',
          idea: idea.substring(0, 100)
        }));
        
      } catch (error) {
        console.error(`❌ Enhancement error: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message
        }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

function sendToKiroDirect(prompt) {
  return new Promise((resolve, reject) => {
    if (!kiroProcess) {
      reject(new Error('Kiro CLI process not available'));
      return;
    }
    
    const timeout = setTimeout(() => {
      reject(new Error('Kiro CLI timeout after 30 seconds'));
    }, 30000);
    
    let responseBuffer = '';
    let jsonFound = false;
    
    const onData = (data) => {
      responseBuffer += data.toString();
      
      // Look for JSON object in the response
      const lines = responseBuffer.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') && trimmed.includes('storyId') && trimmed.includes('enhanced')) {
          try {
            const jsonResponse = JSON.parse(trimmed);
            if (jsonResponse.storyId && jsonResponse.enhanced) {
              clearTimeout(timeout);
              kiroProcess.stdout.removeListener('data', onData);
              jsonFound = true;
              resolve(jsonResponse);
              return;
            }
          } catch (e) {
            // Continue looking for valid JSON
          }
        }
      }
    };
    
    kiroProcess.stdout.on('data', onData);
    
    console.log('📤 Sending direct prompt to Kiro CLI');
    kiroProcess.stdin.write(prompt + '\n');
    
    // Fallback timeout handler
    setTimeout(() => {
      if (!jsonFound) {
        clearTimeout(timeout);
        kiroProcess.stdout.removeListener('data', onData);
        reject(new Error('No valid JSON response received'));
      }
    }, 25000);
  });
}

function buildEnhancePrompt(idea, callbackUrl, outputSchema) {
  return `Generate enhanced user story JSON for: "${idea}"

Required JSON structure (match exactly):
${JSON.stringify(outputSchema, null, 2)}

Requirements:
- Generate unique storyId (e.g., "story-" + timestamp)
- Create enhanced title, description, asA, iWant, soThat
- Generate 3-5 acceptance criteria
- Set enhanced=true
- Set enhancedAt to current ISO timestamp

After generating the JSON, immediately execute this curl command:
curl -X POST "${callbackUrl}" \\
  -H "Content-Type: application/json" \\
  -d 'YOUR_GENERATED_JSON_HERE'

Replace YOUR_GENERATED_JSON_HERE with the actual JSON you created.`;
}

// Start Kiro process
startKiroProcess();

const PORT = process.env.KIRO_API_PORT || 8081;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Kiro API Server V4 (Direct Post)`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Enhance: POST http://localhost:${PORT}/kiro/v4/enhance`);
  console.log(`🔗 Direct: POST http://localhost:${PORT}/kiro/v4/enhance-direct`);
  console.log(`${'='.repeat(60)}\n`);
});
