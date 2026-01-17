#!/usr/bin/env node

// Load environment variables from .env file
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env file if it exists
try {
  const envFile = readFileSync('.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key] = value;
    }
  });
} catch (err) {
  console.log('No .env file found, using system environment variables');
}

import http from 'http';
import { writeFileSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Octokit } from '@octokit/rest';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'demian7575';
const GITHUB_REPO = 'aipm';
const WORK_DIR = process.env.WORK_DIR || process.cwd();

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Shared git command executor (reusable across all git operations)
const execGitCommand = (cmd, cwd = WORK_DIR) => {
  return new Promise((resolve, reject) => {
    const [command, ...args] = cmd.split(' ');
    const proc = spawn(command, args, { cwd });
    
    let output = '';
    proc.stdout.on('data', (data) => output += data.toString());
    proc.stderr.on('data', (data) => output += data.toString());
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed: ${cmd}\n${output}`));
      }
    });
  });
};

// Git sync function with rebase and conflict handling
// NOTE: Uses local execCommand for legacy compatibility

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// DynamoDB setup
const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);
const STORIES_TABLE = process.env.STORIES_TABLE;
const ACCEPTANCE_TESTS_TABLE = process.env.ACCEPTANCE_TESTS_TABLE;

if (!STORIES_TABLE) {
  throw new Error('STORIES_TABLE environment variable is required');
}
if (!ACCEPTANCE_TESTS_TABLE) {
  throw new Error('ACCEPTANCE_TESTS_TABLE environment variable is required');
}

// Load contracts
const CONTRACTS = JSON.parse(
  readFileSync(join(__dirname, 'contracts/contracts.json'), 'utf-8')
);

console.log('📋 Loaded contracts:', Object.keys(CONTRACTS));

// Kiro CLI process
let kiroProcess = null;
let lastKiroResponse = Date.now();
let kiroHealthCheckInterval = null;
let kiroCommandQueue = [];
let kiroProcessing = false;

function startKiroProcess() {
  if (kiroProcess) return;
  
  console.log('🚀 Starting Kiro CLI process...');
  const kiroPath = process.env.KIRO_CLI_PATH || 'kiro-cli';
  
  kiroProcess = spawn(kiroPath, ['chat', '--trust-all-tools'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Create live log file with tee for both stdout and stderr
  const logFile = '/tmp/kiro-cli-live.log';
  const errorLogFile = '/tmp/kiro-cli-error.log';
  
  // Add timestamp and separator to log file
  const timestamp = new Date().toISOString();
  appendFileSync(logFile, `\n\n=== Kiro CLI Session Started: ${timestamp} ===\n`);
  
  const teeProcess = spawn('tee', ['-a', logFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const teeErrorProcess = spawn('tee', ['-a', errorLogFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  
  // Pipe Kiro CLI stdout and stderr to log files with selective line breaks
  kiroProcess.stdout.on('data', (data) => {
    let chunk = data.toString();
    
    // Add line break before purple '>' prompt
    chunk = chunk.replace(/(\x1b\[38;5;141m>\s*)/g, '\n$1');
    
    // Add line breaks only at appropriate points:
    // - After JSON responses
    // - After command completions
    // - NOT after prompts (>) since we want prompts on their own line
    if (chunk.includes('{"') || 
        chunk.includes('✅') || 
        chunk.includes('❌') ||
        chunk.includes('Time:') ||
        chunk.includes('Success') ||
        chunk.includes('Fail')) {
      teeProcess.stdin.write(chunk + '\n');
    } else {
      teeProcess.stdin.write(chunk);
    }
  });
  
  kiroProcess.stderr.on('data', (data) => {
    const chunk = data.toString();
    teeErrorProcess.stdin.write('[ERROR] ' + chunk);
  });
  
  kiroProcess.on('close', () => {
    console.log('Kiro process closed, restarting...');
    kiroProcess = null;
    teeProcess.kill();
    teeErrorProcess.kill();
    setTimeout(startKiroProcess, 1000);
  });
  
  // Reset health tracking
  lastKiroResponse = Date.now();
  
  // Keep stdin open but don't send any command - Kiro CLI will wait for input
  // This keeps it in interactive mode without executing anything
  
  // Start health check if not already running
  if (!kiroHealthCheckInterval) {
    startKiroHealthCheck();
  }
}

function startKiroHealthCheck() {
  kiroHealthCheckInterval = setInterval(() => {
    const timeSinceLastResponse = Date.now() - lastKiroResponse;
    const maxIdleTime = 60 * 60 * 1000; // 60 minutes (increased from 15)
    
    if (timeSinceLastResponse > maxIdleTime) {
      console.log('⚠️ Kiro CLI appears unresponsive, restarting...');
      restartKiroProcess();
    }
  }, 10 * 60 * 1000); // Check every 10 minutes (increased from 5)
}

function restartKiroProcess() {
  if (kiroProcess) {
    console.log('🔄 Restarting Kiro CLI process...');
    kiroProcess.kill();
    kiroProcess = null;
  }
  setTimeout(startKiroProcess, 2000);
}

function sendToKiroWithStatus(prompt) {
  return new Promise((resolve, reject) => {
    if (!kiroProcess) {
      reject(new Error('Kiro CLI process not available'));
      return;
    }
    
    const timeout = setTimeout(() => {
      reject(new Error('Kiro CLI timeout after 600 seconds'));
    }, 600000); // 10 minutes timeout
    
    let responseBuffer = '';
    
    const onData = (data) => {
      const chunk = data.toString();
      responseBuffer += chunk;
      
      // Update health tracking
      lastKiroResponse = Date.now();
      
      // Look for status JSON: {"status": "Success"/"Fail", "message": "..."}
      const statusMatches = responseBuffer.match(/\{"status":\s*"(Success|Fail)"[^}]*\}/g);
      if (statusMatches) {
        for (const match of statusMatches) {
          try {
            const statusResponse = JSON.parse(match);
            if (statusResponse.status && (statusResponse.status === 'Success' || statusResponse.status === 'Fail')) {
              console.log('✅ Found status response:', statusResponse.status);
              clearTimeout(timeout);
              kiroProcess.stdout.removeListener('data', onData);
              resolve(statusResponse);
              return;
            }
          } catch (e) {
            // Continue looking
          }
        }
      }
    };
    
    kiroProcess.stdout.on('data', onData);
    
    console.log('📤 Sending prompt to Kiro CLI (expecting status JSON)');
    
    // Log the command to live log file
    const logFile = '/tmp/kiro-cli-live.log';
    const timestamp = new Date().toISOString();
    appendFileSync(logFile, `\n[${timestamp}] COMMAND SENT TO KIRO CLI:\n${prompt}\n--- END COMMAND ---\n\n`);
    
    kiroProcess.stdin.write(prompt + '\n');
  });
}

async function processKiroQueue() {
  if (kiroProcessing || kiroCommandQueue.length === 0) {
    return;
  }
  
  kiroProcessing = true;
  const { prompt, resolve, reject } = kiroCommandQueue.shift();
  
  try {
    const result = await sendToKiroInternal(prompt);
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    kiroProcessing = false;
    // Process next command in queue
    setTimeout(processKiroQueue, 100);
  }
}

function sendToKiro(prompt) {
  return new Promise((resolve, reject) => {
    kiroCommandQueue.push({ prompt, resolve, reject });
    processKiroQueue();
  });
}

function sendToKiroInternal(prompt) {
  return new Promise((resolve, reject) => {
    if (!kiroProcess) {
      reject(new Error('Kiro CLI process not available'));
      return;
    }
    
    const timeout = setTimeout(() => {
      console.log('⏰ Kiro CLI timeout after 600 seconds, restarting...');
      restartKiroProcess();
      reject(new Error('Kiro CLI timeout after 600 seconds'));
    }, 600000); // 10 minutes timeout
    
    let responseBuffer = '';
    let jsonFound = false;
    let lastOutputTime = Date.now();
    let promptSeen = false;
    let operationInProgress = false;
    
    // Stuck detection: no output during operation > 1 min = restart
    const stuckCheckInterval = setInterval(() => {
      const timeSinceLastOutput = Date.now() - lastOutputTime;
      
      if (operationInProgress && timeSinceLastOutput > 60000) { // 1 minute
        console.log('🚨 Kiro CLI stuck detected (no output for 1 min during operation), restarting...');
        clearTimeout(timeout);
        clearInterval(stuckCheckInterval);
        // // clearInterval(heartbeatInterval); // Disabled // Disabled
        kiroProcess.stdout.removeListener('data', onData);
        kiroProcess.stderr.removeListener('data', onData);
        restartKiroProcess();
        reject(new Error('Kiro CLI stuck - no output during operation'));
        return;
      }
    }, 10000); // Check every 10 seconds
    
    // Heartbeat disabled - causes Kiro CLI to think on empty input
    // const heartbeatInterval = setInterval(() => {
    //   if (promptSeen && !operationInProgress) {
    //     console.log('💓 Sending heartbeat to idle Kiro CLI');
    //     if (kiroProcess && kiroProcess.stdin.writable) {
    //       kiroProcess.stdin.write('\n');
    //     }
    //   }
    // }, 60000);
    
    const onData = (data) => {
      const chunk = data.toString();
      responseBuffer += chunk;
      lastOutputTime = Date.now();
      
      // Update health tracking
      lastKiroResponse = Date.now();
      
      // Detect purple prompt '>' to know when operation starts/ends
      if (chunk.includes('\x1b[38;5;141m>')) {
        promptSeen = true;
        operationInProgress = false;
        console.log('🟣 Prompt detected - operation finished or ready');
      }
      
      // Detect operation in progress (output after prompt)
      if (promptSeen && chunk.length > 0 && !chunk.includes('\x1b[38;5;141m>')) {
        operationInProgress = true;
      }
      
      // Only log significant chunks to reduce noise
      if (chunk.length > 10) {
        console.log('📥 Kiro CLI output chunk:', chunk.substring(0, 100));
      }
      
      // Check if we have a complete response (look for "Time:" indicator)
      if (responseBuffer.includes('Time:') && responseBuffer.length > 50) {
        clearTimeout(timeout);
        clearInterval(stuckCheckInterval);
        // clearInterval(heartbeatInterval); // Disabled
        kiroProcess.stdout.removeListener('data', onData);
        kiroProcess.stderr.removeListener('data', onData);
        
        // Extract the actual response (remove ANSI codes and formatting)
        const cleanResponse = responseBuffer
          .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
          .replace(/\u001B\[[0-9;]*[mGK]/g, '') // Remove more ANSI codes
          .replace(/.*?> /, '') // Remove prompt
          .replace(/▸ Time:.*$/m, '') // Remove timing info
          .trim();
        
        resolve(cleanResponse || responseBuffer.trim());
        jsonFound = true;
        return;
      }
    };
    
    kiroProcess.stdout.on('data', onData);
    kiroProcess.stderr.on('data', onData);
    
    console.log('📤 Sending prompt to Kiro CLI');
    
    // Log the command to live log file
    const logFile = '/tmp/kiro-cli-live.log';
    const timestamp = new Date().toISOString();
    appendFileSync(logFile, `\n[${timestamp}] COMMAND SENT TO KIRO CLI:\n${prompt}\n--- END COMMAND ---\n\n`);
    
    kiroProcess.stdin.write(prompt + '\n');
    
    // Fallback timeout handler
    setTimeout(() => {
      if (!jsonFound) {
        clearTimeout(timeout);
        clearInterval(stuckCheckInterval);
        // clearInterval(heartbeatInterval); // Disabled
        kiroProcess.stdout.removeListener('data', onData);
        reject(new Error('No valid JSON response received'));
      }
    }, 590000); // 9 minutes 50 seconds fallback
  });
}

// DynamoDB helpers
async function getStories() {
  const { Items } = await dynamodb.send(new ScanCommand({
    TableName: STORIES_TABLE
  }));
  
  const stories = Items || [];
  
  // Fetch acceptance tests for all stories
  const { Items: tests } = await dynamodb.send(new ScanCommand({
    TableName: ACCEPTANCE_TESTS_TABLE
  }));
  
  // Group tests by storyId
  const testsByStory = {};
  (tests || []).forEach(test => {
    const storyId = test.storyId;
    if (!storyId) {
      console.warn('⚠️ Acceptance test missing storyId:', test.id);
      return;
    }
    // Normalize field names for frontend compatibility
    test.when = test.whenStep || test.when;
    test.then = test.thenStep || test.then;
    if (!testsByStory[storyId]) {
      testsByStory[storyId] = [];
    }
    testsByStory[storyId].push(test);
  });
  
  // Add acceptance tests to each story
  stories.forEach(story => {
    story.acceptanceTests = testsByStory[story.id] || [];
  });
  
  // Build hierarchical structure
  return buildHierarchy(stories);
}

function buildHierarchy(flatStories) {
  const storyMap = new Map();
  const rootStories = [];
  
  // First pass: create map and initialize children arrays
  flatStories.forEach(story => {
    story.children = [];
    storyMap.set(story.id, story);
  });
  
  // Second pass: build hierarchy
  flatStories.forEach(story => {
    const parentId = story.parentId;
    if (parentId && storyMap.has(parentId)) {
      // Add to parent's children
      const parent = storyMap.get(parentId);
      parent.children.push(story);
    } else {
      // Root level story
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

// Helper function to get main branch SHA
async function getMainBranchSha(owner, repo, token) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`, {
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'AIPM-Bot'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get main branch SHA: ${response.status}`);
  }
  
  const data = await response.json();
  return data.object.sha;
}

const server = http.createServer(async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Health check
  if (url.pathname === '/health') {
    const timeSinceLastResponse = Date.now() - lastKiroResponse;
    const kiroHealthy = timeSinceLastResponse < 15 * 60 * 1000; // 15 minutes
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      service: 'V4',
      version: '4.0',
      kiroProcess: kiroProcess ? 'running' : 'stopped',
      kiroHealthy: kiroHealthy,
      lastKiroResponse: new Date(lastKiroResponse).toISOString(),
      timeSinceLastResponse: `${Math.round(timeSinceLastResponse / 1000)}s`,
      activeRequests: 0,
      maxConcurrent: 10,
      uptime: Math.floor(process.uptime())
    }));
    return;
  }

  // Code generation status endpoint
  if (url.pathname === '/api/code-generation-status' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const statusData = JSON.parse(body);
        console.log('📥 Code generation status received:', statusData);
        
        // Store status for retrieval (simple in-memory storage)
        if (!global.codeGenerationStatus) {
          global.codeGenerationStatus = {};
        }
        global.codeGenerationStatus[statusData.taskId] = statusData;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      } catch (error) {
        console.error('❌ Code generation status error:', error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // GWT response endpoint - receives GWT health analysis from KIRO CLI
  if (url.pathname === '/api/gwt-response' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const gwtData = JSON.parse(body);
        console.log('📊 Received GWT analysis from Kiro CLI:', gwtData);
        
        // Store the analysis with timestamp
        global.latestGwtAnalysis = {
          ...gwtData,
          timestamp: Date.now()
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      } catch (error) {
        console.error('Error parsing GWT response:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // INVEST response endpoint - receives analysis data from KIRO CLI
  if (url.pathname === '/api/invest-response' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const investData = JSON.parse(body);
        console.log('📊 Received INVEST analysis from Kiro CLI:', investData);
        
        // Handle Kiro sending "id" instead of "storyId"
        if (investData.id && !investData.storyId) {
          // Extract numeric ID from "US-0101" format or use as-is if already numeric
          const idStr = String(investData.id);
          const match = idStr.match(/US-0*(\d+)/);
          investData.storyId = match ? parseInt(match[1]) : parseInt(idStr);
          console.log(`⚠️ Mapped id "${investData.id}" to storyId ${investData.storyId}`);
        }
        
        // Store in memory for backward compatibility
        global.latestInvestAnalysis = {
          ...investData,
          timestamp: Date.now()
        };
        
        // Save to DynamoDB if storyId is provided
        if (investData.storyId) {
          await dynamodb.send(new UpdateCommand({
            TableName: STORIES_TABLE,
            Key: { id: investData.storyId },
            UpdateExpression: 'SET investAnalysis = :analysis, updatedAt = :updated',
            ExpressionAttributeValues: {
              ':analysis': {
                summary: investData.summary || '',
                score: investData.score || 0,
                warnings: investData.warnings || [],
                strengths: investData.strengths || [],
                source: investData.source || 'ai',
                model: investData.model || 'kiro-cli'
              },
              ':updated': new Date().toISOString()
            }
          }));
          console.log(`✅ Saved INVEST analysis for story ${investData.storyId}`);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      } catch (error) {
        console.error('Error processing INVEST response:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Draft response endpoint - receives draft data from KIRO CLI
  if (url.pathname === '/api/draft-response' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const draftData = JSON.parse(body);
        // Store draft data temporarily (includes acceptance tests)
        global.latestDraft = { success: true, draft: draftData, timestamp: Date.now() };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      } catch (error) {
        console.error('Error in draft-response:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Acceptance test draft response endpoint - receives draft data from KIRO CLI
  if (url.pathname.match(/^\/api\/stories\/(\d+)\/tests\/draft-response$/) && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const draftData = JSON.parse(body);
        // Store acceptance test draft data temporarily
        global.latestAcceptanceTestDraft = { success: true, acceptanceTests: draftData.acceptanceTests, timestamp: Date.now() };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true }));
      } catch (error) {
        console.error('Error in acceptance test draft-response:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // GWT Health Analysis endpoint (SSE)
  if (url.pathname === '/api/analyze-gwt-stream' && req.method === 'GET') {
    const params = new URLSearchParams(url.search);
    const storyId = params.get('storyId');
    
    if (!storyId) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('storyId is required');
      return;
    }
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    try {
      // Extract numeric story ID for MCP
      const numericStoryId = parseInt(storyId.toString().replace(/^US-/, ''), 10);
      
      const prompt = `Read and follow the template file: ./templates/gwt-health-analysis.md

Use MCP tool get_story with storyId: ${numericStoryId}

Execute the template instructions exactly as written.`;
      
      global.latestGwtAnalysis = null;
      
      res.write(`data: ${JSON.stringify({ status: 'started', message: 'Analyzing GWT health...' })}\n\n`);
      
      await sendToKiro(prompt);
      
      // Poll for result
      const maxAttempts = 180;
      let attempts = 0;
      
      const pollInterval = setInterval(() => {
        attempts++;
        
        if (global.latestGwtAnalysis && (Date.now() - global.latestGwtAnalysis.timestamp) < 30000) {
          const analysisResponse = global.latestGwtAnalysis;
          global.latestGwtAnalysis = null;
          
          res.write(`data: ${JSON.stringify({ 
            status: 'complete',
            success: true,
            analysis: analysisResponse,
            elapsed: attempts 
          })}\n\n`);
          res.end();
          clearInterval(pollInterval);
        } else if (attempts >= maxAttempts) {
          res.write(`data: ${JSON.stringify({ 
            status: 'timeout', 
            error: 'Timeout after 180 seconds' 
          })}\n\n`);
          res.end();
          clearInterval(pollInterval);
        } else if (attempts % 5 === 0) {
          res.write(`data: ${JSON.stringify({ 
            status: 'progress', 
            message: `Analyzing... ${attempts}s elapsed` 
          })}\n\n`);
        }
      }, 1000);
      
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
    return;
  }

  // GWT Health Analysis endpoint (Legacy)

  // INVEST analysis endpoint (SSE)
  if (url.pathname === '/api/analyze-invest-stream' && req.method === 'GET') {
    const params = new URLSearchParams(url.search);
    const storyId = params.get('storyId');
    
    if (!storyId) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('storyId is required');
      return;
    }
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    try {
      console.log('📊 INVEST SSE request for story:', storyId);
      
      // Extract numeric story ID for MCP
      const numericStoryId = parseInt(storyId.toString().replace(/^US-/, ''), 10);
      
      const prompt = `Read and follow the template file: ./templates/invest-analysis.md

Use MCP tool get_story with storyId: ${numericStoryId}

Execute the template instructions exactly as written.`;
      
      global.latestInvestAnalysis = null;
      
      res.write(`data: ${JSON.stringify({ status: 'started', message: 'Analyzing INVEST criteria...' })}\n\n`);
      
      console.log('📤 Sending to Kiro:', prompt.substring(0, 100) + '...');
      await sendToKiro(prompt);
      console.log('✅ Sent to Kiro, waiting for response...');
      
      // Poll for result
      const maxAttempts = 180;
      let attempts = 0;
      
      const pollInterval = setInterval(() => {
        attempts++;
        
        if (global.latestInvestAnalysis && (Date.now() - global.latestInvestAnalysis.timestamp) < 30000) {
          const analysisResponse = global.latestInvestAnalysis;
          global.latestInvestAnalysis = null;
          
          console.log('✅ Got INVEST analysis response');
          res.write(`data: ${JSON.stringify({ 
            status: 'complete',
            success: true,
            analysis: analysisResponse,
            elapsed: attempts 
          })}\n\n`);
          res.end();
          clearInterval(pollInterval);
        } else if (attempts >= maxAttempts) {
          res.write(`data: ${JSON.stringify({ 
            status: 'timeout', 
            error: 'Timeout after 180 seconds' 
          })}\n\n`);
          res.end();
          clearInterval(pollInterval);
        } else if (attempts % 5 === 0) {
          res.write(`data: ${JSON.stringify({ 
            status: 'progress', 
            message: `Analyzing... ${attempts}s elapsed` 
          })}\n\n`);
        }
      }, 1000);
      
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
    return;
  }

  // INVEST analysis endpoint (Legacy)

  // Generate draft endpoint (SSE)
  if (url.pathname === '/api/generate-draft-stream' && req.method === 'GET') {
    const params = new URLSearchParams(url.search);
    const feature_description = params.get('feature_description') || 'user login system';
    const parentId = params.get('parentId') || null;
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    try {
      const prompt = `Read and follow the template file: ./templates/user-story-generation.md

Feature description: "${feature_description}"
Parent ID: ${parentId}

Execute the template instructions exactly as written.`;
      
      global.latestDraft = null;
      
      res.write(`data: ${JSON.stringify({ status: 'started', message: 'Kiro CLI started...' })}\n\n`);
      
      await sendToKiro(prompt);
      
      // Poll for result
      const maxAttempts = 180;
      let attempts = 0;
      
      const pollInterval = setInterval(() => {
        attempts++;
        
        if (global.latestDraft && (Date.now() - global.latestDraft.timestamp) < 30000) {
          const draftResponse = global.latestDraft;
          global.latestDraft = null;
          
          res.write(`data: ${JSON.stringify({ 
            status: 'complete',
            ...draftResponse,
            elapsed: attempts 
          })}\n\n`);
          res.end();
          clearInterval(pollInterval);
        } else if (attempts >= maxAttempts) {
          res.write(`data: ${JSON.stringify({ 
            status: 'timeout', 
            error: 'Timeout after 180 seconds' 
          })}\n\n`);
          res.end();
          clearInterval(pollInterval);
        } else if (attempts % 5 === 0) {
          res.write(`data: ${JSON.stringify({ 
            status: 'progress', 
            message: `Generating... ${attempts}s elapsed` 
          })}\n\n`);
        }
      }, 1000);
      
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
    return;
  }

  // Generate draft endpoint (Legacy - for frontend Generate button)
  if (url.pathname === '/api/generate-draft' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { feature_description = 'user login system', parentId = null } = JSON.parse(body);
        
        // Template System: API gives KIRO CLI the filename to read
        const prompt = `Read and follow the template file: ./templates/user-story-generation.md

Feature description: "${feature_description}"
Parent ID: ${parentId}

Execute the template instructions exactly as written.`;
        
        // Clear any existing draft data
        global.latestDraft = null;
        
        // Execute KIRO CLI and wait for completion
        const result = await sendToKiro(prompt);
        
        // Poll for draft data (max 180 seconds)
        const maxAttempts = 180; // 180 seconds
        const pollInterval = 1000; // 1 second
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          attempts++;
          
          // Check if we received draft data
          if (global.latestDraft && (Date.now() - global.latestDraft.timestamp) < 30000) {
            const draftResponse = global.latestDraft;
            global.latestDraft = null; // Clear after use
            
            console.log(`✅ User Story draft received after ${attempts} seconds`);
            
            // Return draft data WITHOUT saving to database
            // Frontend will save when user clicks "Create Story"
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(draftResponse));
            return;
          }
        }
        
        // Timeout - no draft received
        console.log(`⏱️ User Story draft timeout after ${maxAttempts} seconds`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Timeout: No draft data received from KIRO after 180 seconds'
        }));
        
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Generate acceptance test draft endpoint (SSE)
  // SSE endpoint for acceptance test draft generation
  if (url.pathname.match(/^\/api\/stories\/([^\/]+)\/tests\/generate-draft-stream$/) && req.method === 'GET') {
    const storyIdMatch = url.pathname.match(/^\/api\/stories\/([^\/]+)\/tests\/generate-draft-stream$/);
    const storyId = storyIdMatch[1];
    
    const params = new URLSearchParams(url.search);
    const idea = params.get('idea') || '';
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    try {
      // Extract numeric story ID for MCP tool
      const numericStoryId = parseInt(storyId.toString().replace(/^US-/, ''), 10);
      
      const prompt = `Read and follow the template file: ./templates/acceptance-test-generation.md

Use MCP tool get_story with storyId: ${numericStoryId}
${idea ? `Idea: "${idea}"` : ''}

Execute the template instructions exactly as written. Generate 1-2 new tests that avoid duplicating existing tests.`;
      
      global.latestAcceptanceTestDraft = null;
      
      res.write(`data: ${JSON.stringify({ status: 'started', message: 'Kiro CLI started...' })}\n\n`);
      
      await sendToKiro(prompt);
      
      // Poll for result
      const maxAttempts = 180;
      let attempts = 0;
      
      const pollInterval = setInterval(() => {
        attempts++;
        
        if (global.latestAcceptanceTestDraft && (Date.now() - global.latestAcceptanceTestDraft.timestamp) < 30000) {
          const draftResponse = global.latestAcceptanceTestDraft;
          global.latestAcceptanceTestDraft = null;
          
          res.write(`data: ${JSON.stringify({ 
            status: 'complete', 
            success: true,
            acceptanceTests: draftResponse.acceptanceTests,
            elapsed: attempts 
          })}\n\n`);
          res.end();
          clearInterval(pollInterval);
        } else if (attempts >= maxAttempts) {
          res.write(`data: ${JSON.stringify({ 
            status: 'timeout', 
            error: 'Timeout after 180 seconds' 
          })}\n\n`);
          res.end();
          clearInterval(pollInterval);
        } else if (attempts % 5 === 0) {
          res.write(`data: ${JSON.stringify({ 
            status: 'progress', 
            message: `Generating... ${attempts}s elapsed` 
          })}\n\n`);
        }
      }, 1000);
      
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
    return;
  }

  // Generate acceptance test draft endpoint (Legacy - keep for compatibility)
  if (url.pathname.match(/^\/api\/stories\/([^\/]+)\/tests\/generate-draft$/) && req.method === 'POST') {
    const storyIdMatch = url.pathname.match(/^\/api\/stories\/([^\/]+)\/tests\/generate-draft$/);
    const storyId = storyIdMatch[1];
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { idea = '' } = JSON.parse(body);
        
        // Get story data
        const storyResponse = await fetch(`http://localhost:8081/api/stories/${storyId}`);
        if (!storyResponse.ok) {
          throw new Error('Story not found');
        }
        const story = await storyResponse.json();
        
        // Extract numeric ID from story (e.g., "US-0311" -> "0311" or "0311" -> "0311")
        const numericStoryId = story.id.toString().replace(/^US-/, '');
        
        const prompt = `Read and follow the template file: ./templates/acceptance-test-generation.md

Use MCP tool get_story with storyId: ${numericStoryId}
${idea ? `Idea: "${idea}"` : ''}

Execute the template instructions exactly as written. Generate 1-2 new tests that avoid duplicating existing tests.`;
        
        // Clear any existing draft data
        global.latestAcceptanceTestDraft = null;
        
        // Execute KIRO CLI and wait for completion
        const result = await sendToKiro(prompt);
        
        // Poll for draft data (max 180 seconds)
        const maxAttempts = 180; // 180 seconds
        const pollInterval = 1000; // 1 second
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          attempts++;
          
          // Check if we received draft data
          if (global.latestAcceptanceTestDraft && (Date.now() - global.latestAcceptanceTestDraft.timestamp) < 30000) {
            const draftResponse = global.latestAcceptanceTestDraft;
            global.latestAcceptanceTestDraft = null; // Clear after use
            
            console.log(`✅ Draft received after ${attempts} seconds`);
            
            // Return draft data WITHOUT saving to database
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(draftResponse));
            return;
          }
        }
        
        // Timeout - no draft received
        console.log(`⏱️ Draft timeout after ${maxAttempts} seconds`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Timeout: No draft data received from KIRO after 180 seconds'
        }));
        
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/stories' && req.method === 'GET') {
    try {
      const stories = await getStories();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stories));
    } catch (error) {
      console.error('Error in GET /api/stories:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Generate story draft
  if (url.pathname === '/api/stories/draft' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { idea, parentId } = JSON.parse(body);
        
        if (!idea) {
          throw new Error('Missing required field: idea');
        }
        
        console.log(`📥 Story draft request: ${idea.substring(0, 50)}...`);
        
        // Get parent context if needed
        let parentContext = '';
        if (parentId) {
          try {
            const { Item: parent } = await dynamodb.send(new GetCommand({
              TableName: STORIES_TABLE,
              Key: { id: parentId }
            }));
            if (parent) {
              parentContext = ` (child of: ${parent.title})`;
            }
          } catch (e) {
            console.warn('Could not fetch parent story:', e.message);
          }
        }
        
        // Build simple prompt for AI enhancement
        const prompt = `Create basic user story for: "${idea}${parentContext}"

Generate the fields and immediately place them into this JSON template:
{"storyId":"story-${Date.now()}","title":"[title]","description":"[description]","asA":"[asA]","iWant":"[iWant]","soThat":"[soThat]","enhanced":true,"enhancedAt":"${new Date().toISOString()}"}`;
        
        // Get AI-enhanced story
        const enhancedStory = await sendToKiro(prompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(enhancedStory));
        
      } catch (error) {
        console.error(`❌ Story draft error: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
    return;
  }

  // Get single story
  if (url.pathname.startsWith('/api/stories/') && req.method === 'GET') {
    try {
      const id = parseInt(url.pathname.split('/')[3]);
      if (isNaN(id)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid story ID' }));
        return;
      }
      
      const { Item: story } = await dynamodb.send(new GetCommand({
        TableName: STORIES_TABLE,
        Key: { id }
      }));
      
      if (!story) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Story not found' }));
        return;
      }
      
      // Fetch acceptance tests for this story
      const { Items: tests } = await dynamodb.send(new QueryCommand({
        TableName: ACCEPTANCE_TESTS_TABLE,
        IndexName: 'storyId-index',
        KeyConditionExpression: 'storyId = :sid',
        ExpressionAttributeValues: { ':sid': id }
      }));
      
      // Normalize field names for frontend compatibility
      (tests || []).forEach(test => {
        test.when = test.whenStep || test.when;
        test.then = test.thenStep || test.then;
      });
      
      story.acceptanceTests = tests || [];
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(story));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Update story (PUT and PATCH)
  if (url.pathname.startsWith('/api/stories/') && (req.method === 'PUT' || req.method === 'PATCH')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const id = parseInt(url.pathname.split('/')[3]);
        if (isNaN(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid story ID' }));
          return;
        }
        
        const updates = JSON.parse(body);
        updates.updatedAt = new Date().toISOString();
        
        // Build update expression
        const updateExpression = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};
        
        Object.keys(updates).forEach(key => {
          if (key !== 'id') {
            updateExpression.push(`#${key} = :${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}`] = updates[key];
          }
        });
        
        await dynamodb.send(new UpdateCommand({
          TableName: STORIES_TABLE,
          Key: { id },
          UpdateExpression: `SET ${updateExpression.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW'
        }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, ...updates }));
      } catch (error) {
        console.error('❌ Update story error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Delete story
  if (url.pathname.startsWith('/api/stories/') && req.method === 'DELETE') {
    try {
      const id = parseInt(url.pathname.split('/')[3]);
      if (isNaN(id)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid story ID' }));
        return;
      }
      
      await dynamodb.send(new DeleteCommand({
        TableName: STORIES_TABLE,
        Key: { id }
      }));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Story deleted successfully' }));
    } catch (error) {
      console.error('❌ Delete story error:', error);
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
        
        // Generate numeric ID for DynamoDB
        const numericId = Date.now();
        story.id = numericId;
        
        // Remove storyId if present (use id instead)
        delete story.storyId;
        
        console.log('📝 Creating story with ID:', numericId);
        
        const createdStory = await createStory(story);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(createdStory));
      } catch (error) {
        console.error('❌ Create story error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Create PR
  if (url.pathname === '/api/create-pr' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { storyId, branchName, prTitle, prBody, story: storyData } = JSON.parse(body);
        
        console.log('📝 Creating GitHub PR for story:', storyId);
        console.log('📝 Branch name:', branchName);
        console.log('📝 PR title:', prTitle);
        
        // Create actual GitHub PR using GitHub API
        const githubToken = process.env.GITHUB_TOKEN;
        const owner = 'demian7575';
        const repo = 'aipm';
        
        if (!githubToken) {
          console.log('⚠️ No GitHub token found, creating PR card only');
          // Fallback to creating just a PR card
          const prNumber = Math.floor(Math.random() * 1000) + 1;
          const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;
          
          const prEntry = {
            number: prNumber,
            title: prTitle,
            taskTitle: prTitle,
            body: prBody,
            branchName: branchName,
            url: prUrl,
            prUrl: prUrl,
            htmlUrl: prUrl,
            status: 'open',
            createdAt: new Date().toISOString(),
            storyId: storyId,
            note: 'PR card only - GitHub integration needed'
          };
          
          // Add PR to story
          const { Item: story } = await dynamodb.send(new GetCommand({
            TableName: STORIES_TABLE,
            Key: { id: storyId }
          }));
          
          if (story) {
            if (!story.prs) story.prs = [];
            story.prs.push(prEntry);
            
            await dynamodb.send(new PutCommand({
              TableName: STORIES_TABLE,
              Item: {
                ...story,
                updatedAt: new Date().toISOString()
              }
            }));
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, prEntry }));
          return;
        }
        
        try {
          // First, create the branch and push initial commit
          const createBranchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'AIPM-Bot'
            },
            body: JSON.stringify({
              ref: `refs/heads/${branchName}`,
              sha: await getMainBranchSha(owner, repo, githubToken)
            })
          });
          
          if (!createBranchResponse.ok) {
            throw new Error(`Failed to create branch: ${createBranchResponse.status}`);
          }
          
          // Create unique TASK file content
          const timestamp = Date.now();
          const taskFileName = `TASK-${storyId}-${timestamp}.md`;
          const taskContent = `# ${prTitle}

## Story Details
${storyData.description || 'No description provided'}

## Acceptance Criteria
${prBody}

## Branch
${branchName}

## Story ID
${storyId}

## Created
${new Date().toISOString()}
`;
          
          // Create the file in the branch
          const createFileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${taskFileName}`, {
            method: 'PUT',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'AIPM-Bot'
            },
            body: JSON.stringify({
              message: `Add task for: ${prTitle}`,
              content: Buffer.from(taskContent).toString('base64'),
              branch: branchName
            })
          });
          
          if (!createFileResponse.ok) {
            throw new Error(`Failed to create file: ${createFileResponse.status}`);
          }
          
          // Create the pull request
          const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'AIPM-Bot'
            },
            body: JSON.stringify({
              title: prTitle,
              body: prBody,
              head: branchName,
              base: 'main'
            })
          });
          
          if (!prResponse.ok) {
            const errorText = await prResponse.text();
            throw new Error(`Failed to create PR: ${prResponse.status} - ${errorText}`);
          }
          
          const prData = await prResponse.json();
          console.log('✅ Created GitHub PR:', prData.html_url);
          
          // Create PR entry that matches frontend expectations
          const prEntry = {
            number: prData.number,
            title: prTitle,
            taskTitle: prTitle,
            body: prBody,
            branchName: branchName,
            url: prData.html_url,
            prUrl: prData.html_url,
            htmlUrl: prData.html_url,
            status: 'open',
            createdAt: new Date().toISOString(),
            storyId: storyId
          };
          
          // Add PR to story
          const { Item: story } = await dynamodb.send(new GetCommand({
            TableName: STORIES_TABLE,
            Key: { id: storyId }
          }));
          
          if (story) {
            if (!story.prs) story.prs = [];
            story.prs.push(prEntry);
            
            await dynamodb.send(new PutCommand({
              TableName: STORIES_TABLE,
              Item: {
                ...story,
                updatedAt: new Date().toISOString()
              }
            }));
          }
          
          const prResponseData = {
            success: true,
            message: `Pull request "${prTitle}" created successfully`,
            prNumber: prData.number,
            branchName: branchName,
            prUrl: prData.html_url,
            storyId: storyId,
            prEntry: prEntry
          };
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(prResponseData));
          
        } catch (githubError) {
          console.error('❌ GitHub API error:', githubError);
          // Fallback to creating just a PR card
          const prNumber = Math.floor(Math.random() * 1000) + 1;
          const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;
          
          const prEntry = {
            number: prNumber,
            title: prTitle,
            taskTitle: prTitle,
            body: prBody,
            branchName: branchName,
            url: prUrl,
            prUrl: prUrl,
            htmlUrl: prUrl,
            status: 'open',
            createdAt: new Date().toISOString(),
            storyId: storyId,
            note: `GitHub API error: ${githubError.message}`
          };
          
          // Add PR to story
          const { Item: story } = await dynamodb.send(new GetCommand({
            TableName: STORIES_TABLE,
            Key: { id: storyId }
          }));
          
          if (story) {
            if (!story.prs) story.prs = [];
            story.prs.push(prEntry);
            
            await dynamodb.send(new PutCommand({
              TableName: STORIES_TABLE,
              Item: {
                ...story,
                updatedAt: new Date().toISOString()
              }
            }));
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, prEntry, note: 'Created PR card only due to GitHub API error' }));
        }
      } catch (error) {
        console.error('❌ Create PR error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Story PRs management
  if (url.pathname.match(/^\/api\/stories\/\d+\/prs$/) && req.method === 'POST') {
    const storyId = parseInt(url.pathname.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prs } = JSON.parse(body);
        
        // Update story with new PRs array
        await dynamodb.send(new UpdateCommand({
          TableName: STORIES_TABLE,
          Key: { id: storyId },
          UpdateExpression: 'SET prs = :prs, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':prs': prs,
            ':updatedAt': new Date().toISOString()
          }
        }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(prs));
      } catch (error) {
        console.error('❌ Update story PRs error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Delete PR
  if (url.pathname.match(/^\/api\/stories\/\d+\/prs\/\d+$/) && req.method === 'DELETE') {
    const storyId = parseInt(url.pathname.split('/')[3]);
    const prNumber = parseInt(url.pathname.split('/')[5]);
    
    try {
      // Get current story
      const { Item: story } = await dynamodb.send(new GetCommand({
        TableName: STORIES_TABLE,
        Key: { id: storyId }
      }));
      
      if (story && story.prs) {
        // Remove the PR from the array
        story.prs = story.prs.filter(pr => pr.number !== prNumber);
        
        // Update the story
        await dynamodb.send(new PutCommand({
          TableName: STORIES_TABLE,
          Item: {
            ...story,
            updatedAt: new Date().toISOString()
          }
        }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(story.prs));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Story or PR not found' }));
      }
    } catch (error) {
      console.error('❌ Delete PR error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Kiro chat endpoint
  if (url.pathname === '/kiro/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        
        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Message is required' }));
          return;
        }
        
        console.log('🤖 Kiro chat request:', message.substring(0, 100) + '...');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true,
          response: `Chat response to: ${message}`,
          timestamp: new Date().toISOString()
        }));
        
      } catch (error) {
        console.error('❌ Kiro chat error:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Get available templates
  if (url.pathname === '/api/templates' && req.method === 'GET') {
    try {
      const templates = [];
      const templateFiles = ['user-story-generation.json', 'acceptance-test-generation.json', 'code-generation.json'];
      
      for (const file of templateFiles) {
        try {
          const templateContent = readFileSync(`./templates/${file}`, 'utf8');
          const template = JSON.parse(templateContent);
          templates.push({
            templateId: template.templateId,
            version: template.version,
            description: template.description,
            inputSchema: template.input.schema,
            outputSchema: template.output.schema
          });
        } catch (error) {
          console.warn(`Could not load template ${file}:`, error.message);
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ templates }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Flexible enhance endpoint with template support
  if (url.pathname === '/api/enhance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { templateId = 'user-story-generation', input, context = {} } = JSON.parse(body);
        
        // Load template (try .md first, then .json)
        let templatePath = `./templates/${templateId}.md`;
        let template;
        let isMarkdownTemplate = false;
        
        try {
          const templateContent = readFileSync(templatePath, 'utf8');
          // For markdown templates, create a simple structure
          template = {
            templateId,
            prompt: {
              template: templateContent,
              variables: {
                inputJson: JSON.stringify(input, null, 2)
              }
            }
          };
          isMarkdownTemplate = true;
        } catch (error) {
          // Fallback to JSON template
          templatePath = `./templates/${templateId}.json`;
          try {
            const templateContent = readFileSync(templatePath, 'utf8');
            template = JSON.parse(templateContent);
          } catch (jsonError) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Template not found: ${templateId}` }));
            return;
          }
        }

        // Validate input (skip for markdown templates)
        if (!isMarkdownTemplate) {
          const required = template.input.schema.required || [];
          for (const field of required) {
            if (!(field in input)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Missing required field: ${field}` }));
              return;
            }
          }
        }

        // Build prompt from template
        let prompt;
        
        if (isMarkdownTemplate) {
          // For markdown templates, simple variable substitution
          prompt = template.prompt.template;
          const variables = template.prompt.variables || {};
          for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            prompt = prompt.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
          }
        } else {
          // Original JSON template processing
          prompt = template.prompt.template;
          
          // Replace variables
          const variables = template.prompt.variables || {};
          for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            let replacement = value;
            
            if (value.startsWith('{{input.')) {
              const inputKey = value.slice(8, -2);
              replacement = input[inputKey] || '';
            } else if (value.startsWith('{{output.')) {
              const outputKey = value.slice(9, -2);
              replacement = JSON.stringify(template.output[outputKey], null, 2);
            } else if (value.includes('{{#if') && value.includes('input.parentId')) {
              if (input.parentId) {
                replacement = `\nParent Story ID: ${input.parentId}`;
              } else {
                replacement = '';
              }
            }
            
            prompt = prompt.replace(placeholder, replacement);
          }
        }

        console.log(`🤖 Template: ${templateId}, Input:`, Object.keys(input));
        
        // Send to Kiro CLI and wait for completion
        const enhancedResult = await sendToKiro(prompt);
        
        // Extract story data from Kiro CLI response
        let storyData = null;
        try {
          // Clean the response first
          const cleanResponse = enhancedResult
            .replace(/\u001B\[[\d;]*[mGKH]/g, '') // Remove ANSI codes
            .replace(/\u001B\[\?25[lh]/g, '')     // Remove cursor codes
            .replace(/[\r\n]*[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]\s*Thinking\.\.\.[\r\n]*/g, '') // Remove spinners
            .trim();
          
          // Look for JSON object with storyId or id
          const jsonMatch = cleanResponse.match(/\{[\s\S]*?("storyId"|"id")[\s\S]*?\}/);
          if (jsonMatch) {
            storyData = JSON.parse(jsonMatch[0]);
            // Normalize id to storyId if needed
            if (storyData.id && !storyData.storyId) {
              storyData.storyId = storyData.id;
            }
            console.log('✅ Extracted story data:', storyData.title);
          }
        } catch (e) {
          console.warn('Could not parse story data from Kiro response:', e.message);
        }
        
        // Post story to backend if extraction successful (disabled for markdown templates - Kiro CLI posts directly)
        let postResult = null;
        if (!isMarkdownTemplate && storyData && (templateId === 'user-story-generation' || templateId === 'test-simple')) {
          try {
            const postResponse = await fetch('http://localhost:3000/api/story-created', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(storyData)
            });
            
            if (postResponse.ok) {
              postResult = await postResponse.json();
              console.log('✅ Posted story to backend:', postResult.id);
            } else {
              console.error('❌ Failed to post story:', postResponse.status);
            }
          } catch (postError) {
            console.error('❌ Error posting story:', postError.message);
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true,
          templateId,
          enhanced: enhancedResult,
          storyData: storyData, // Include parsed story data for frontend
          postResult: postResult, // Include backend posting result
          timestamp: new Date().toISOString()
        }));
        
      } catch (error) {
        console.error('❌ Template enhance error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Kiro v3 transform endpoint (for code generation)
  if (url.pathname === '/kiro/v3/transform' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { contractId, inputJson } = JSON.parse(body);
        
        console.log('🔄 Kiro v3 transform request:', contractId);
        console.log('📝 Input:', inputJson);
        
        if (contractId === 'generate-code-v1') {
          const { taskId, prompt, prNumber, branchName, storyId, storyTitle } = inputJson;
          
          console.log('🤖 Code generation for PR:', prNumber);
          console.log('📝 Prompt:', prompt?.substring(0, 100) + '...');
          
          // Call Kiro CLI for code generation - let it do the work directly
          try {
            const kiroPrompt = `/reset

Generate code for GitHub PR #${prNumber} on branch ${branchName}.

Task: ${storyTitle || 'Code Generation Task'}
Prompt: ${prompt}

Please:
1. Fetch the latest changes: git fetch origin
2. Check out main branch: git checkout main
3. Pull latest main: git pull origin main
4. Check out the PR branch: git checkout ${branchName}
5. Rebase onto latest main: git rebase origin/main
6. If conflicts exist, resolve them or create a new branch from main
7. Analyze the current codebase and generate the required code files
8. Commit all changes and push to the PR branch

Return: {"status": "Success", "message": "Code generated and pushed successfully"} or {"status": "Fail", "message": "Error description"}`;

            console.log('📤 Calling Kiro CLI for code generation...');
            
            // Initialize the response object
            const transformResult = {
              success: true,
              outputJson: {
                taskId: taskId,
                prNumber: prNumber,
                branchName: branchName,
                files: [`Generated files for ${storyTitle}`],
                commitMessage: `feat: Generate code for ${storyTitle}`,
                committed: true,
                prUrl: `https://github.com/demian7575/aipm/pull/${prNumber}`,
                summary: `Kiro CLI is generating code for PR #${prNumber}`,
                status: 'in_progress',
                generatedAt: new Date().toISOString()
              }
            };
            
            // Send to Kiro CLI and wait for JSON response
            sendToKiroWithStatus(kiroPrompt).then(statusResult => {
              console.log('📥 Code generation status:', statusResult);
              if (statusResult.status === 'Success') {
                transformResult.outputJson.status = 'completed';
                transformResult.outputJson.summary = statusResult.message || 'Code generated and pushed successfully';
              } else {
                transformResult.outputJson.status = 'failed';
                transformResult.outputJson.summary = statusResult.message || 'Code generation failed';
                transformResult.success = false;
              }
            }).catch(error => {
              console.log('⚠️ Code generation error:', error.message);
              transformResult.outputJson.status = 'failed';
              transformResult.outputJson.summary = `Error: ${error.message}`;
              transformResult.success = false;
            });
            
            // Update the existing PR in the story
            try {
              const { Item: currentStory } = await dynamodb.send(new GetCommand({
                TableName: STORIES_TABLE,
                Key: { id: storyId }
              }));
              
              if (currentStory && currentStory.prs) {
                const prIndex = currentStory.prs.findIndex(pr => pr.number === prNumber);
                if (prIndex !== -1) {
                  currentStory.prs[prIndex].files = ['Kiro CLI generating...'];
                  currentStory.prs[prIndex].lastGenerated = new Date().toISOString();
                  currentStory.prs[prIndex].generatedCode = true;
                  currentStory.prs[prIndex].committed = true;
                  
                  await dynamodb.send(new PutCommand({
                    TableName: STORIES_TABLE,
                    Item: {
                      ...currentStory,
                      updatedAt: new Date().toISOString()
                    }
                  }));
                  
                  console.log('✅ Updated PR status - Kiro CLI is working on:', prNumber);
                }
              }
            } catch (error) {
              console.warn('⚠️ Could not update PR status:', error.message);
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(transformResult));
            
          } catch (error) {
            console.error('❌ Kiro CLI code generation failed:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false,
              error: error.message 
            }));
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false,
            error: `Unsupported contract: ${contractId}` 
          }));
        }
      } catch (error) {
        console.error('❌ Kiro v3 transform error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message 
        }));
      }
    });
    return;
  }

  // Personal delegate (code generation)
  if (url.pathname === '/api/personal-delegate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { owner, repo, storyId, taskTitle, objective, constraints, acceptanceCriteria, enableGatingTests, deployToDev, maxIterations } = payload;
        
        console.log('🤖 Code generation request for story:', storyId);
        console.log('📝 Task title:', taskTitle);
        console.log('🎯 Objective:', objective?.substring(0, 100) + '...');
        
        // Generate a mock PR number and branch name
        const prNumber = Math.floor(Math.random() * 1000) + 1;
        const branchName = `feature/story-${storyId}-${Date.now()}`;
        const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;
        
        // Safe task title for file names
        const safeTaskTitle = (taskTitle || 'GeneratedCode').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
        
        // Simulate code generation process
        const codeGenResponse = {
          success: true,
          message: 'Code generation completed successfully',
          prNumber: prNumber,
          branchName: branchName,
          prUrl: prUrl,
          storyId: storyId,
          taskTitle: taskTitle || 'Generated Code',
          filesGenerated: [
            `src/components/${safeTaskTitle}.js`,
            `src/styles/${safeTaskTitle}.css`,
            `tests/${safeTaskTitle}.test.js`
          ],
          commitMessage: `feat: ${taskTitle || 'Generated Code'}\n\n${objective || 'Auto-generated code'}`,
          status: 'completed',
          generatedAt: new Date().toISOString()
        };
        
        // Add the generated PR to the story
        try {
          const { Item: currentStory } = await dynamodb.send(new GetCommand({
            TableName: STORIES_TABLE,
            Key: { id: storyId }
          }));
          
          if (currentStory) {
            if (!currentStory.prs) {
              currentStory.prs = [];
            }
            
            // Create PR entry for the generated code
            const prEntry = {
              number: prNumber,
              title: `Generated: ${taskTitle || 'Code'}`,
              body: `Auto-generated code for: ${objective || 'Code generation task'}`,
              branchName: branchName,
              url: prUrl,
              status: 'open',
              createdAt: new Date().toISOString(),
              storyId: storyId,
              generated: true,
              files: codeGenResponse.filesGenerated
            };
            
            currentStory.prs.push(prEntry);
            
            await dynamodb.send(new PutCommand({
              TableName: STORIES_TABLE,
              Item: {
                ...currentStory,
                updatedAt: new Date().toISOString()
              }
            }));
            
            console.log('✅ Generated PR added to story:', storyId, 'PR:', prNumber);
          }
        } catch (error) {
          console.warn('⚠️ Could not add generated PR to story:', error.message);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(codeGenResponse));
      } catch (error) {
        console.error('❌ Code generation error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message,
          message: 'Code generation failed'
        }));
      }
    });
    return;
  }

  // Personal delegate status
  if (url.pathname.startsWith('/api/personal-delegate/status') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ready',
      fetchedAt: new Date().toISOString(),
      message: 'Personal delegate service is ready'
    }));
    return;
  }
  if (url.pathname.match(/^\/api\/stories\/\d+\/health-check$/) && req.method === 'POST') {
    const storyId = parseInt(url.pathname.split('/')[3]);
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const options = body ? JSON.parse(body) : {};
        
        // Get the story
        const { Item: story } = await dynamodb.send(new GetCommand({
          TableName: STORIES_TABLE,
          Key: { id: storyId }
        }));
        
        if (!story) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Story not found' }));
          return;
        }
        
        // If AI INVEST check requested, trigger it via existing endpoint
        if (options.includeAiInvest) {
          // Get acceptance tests
          const { Items: tests } = await dynamodb.send(new QueryCommand({
            TableName: ACCEPTANCE_TESTS_TABLE,
            IndexName: 'storyId-index',
            KeyConditionExpression: 'storyId = :sid',
            ExpressionAttributeValues: { ':sid': storyId }
          }));
          
          // Call existing analyze-invest endpoint
          const analyzeResponse = await fetch('http://localhost:8081/api/analyze-invest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storyId: storyId,
              title: story.title,
              asA: story.asA,
              iWant: story.iWant,
              soThat: story.soThat,
              description: story.description,
              storyPoint: story.storyPoint,
              components: story.components,
              acceptanceTests: tests || []
            })
          });
          
          if (!analyzeResponse.ok) {
            throw new Error('INVEST analysis failed');
          }
          
          // Fetch updated story
          const { Item: updatedStory } = await dynamodb.send(new GetCommand({
            TableName: STORIES_TABLE,
            Key: { id: storyId }
          }));
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updatedStory || story));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(story));
        }
      } catch (error) {
        console.error('Error in health-check:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Story tests endpoints
  if (url.pathname.match(/^\/api\/stories\/\d+\/tests$/) && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const storyId = parseInt(url.pathname.split('/')[3]);
        const testData = JSON.parse(body);
        
        const testId = Date.now();
        const acceptanceTest = {
          id: testId,
          storyId: storyId,
          title: testData.title,
          given: Array.isArray(testData.given) ? testData.given : [testData.given],
          whenStep: Array.isArray(testData.when) ? testData.when : [testData.when],
          thenStep: Array.isArray(testData.then) ? testData.then : [testData.then],
          status: testData.status || 'Draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await dynamodb.send(new PutCommand({
          TableName: ACCEPTANCE_TESTS_TABLE,
          Item: acceptanceTest
        }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Test created successfully',
          testId: testId,
          test: acceptanceTest
        }));
      } catch (error) {
        console.error('Error creating acceptance test:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Version endpoint
  if (url.pathname === '/api/version' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      version: '4.0.0',
      service: 'kiro-api-server-v4-full',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Runtime data endpoint
  if (url.pathname === '/api/runtime-data' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Runtime data export not implemented in Kiro API server',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Deploy PR endpoint
  if (url.pathname === '/api/trigger-deployment' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { prNumber, branchName } = payload;
        
        if (!prNumber && !branchName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'PR number or branch name required' }));
          return;
        }

        // Trigger GitHub Actions workflow
        try {
          await octokit.rest.actions.createWorkflowDispatch({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            workflow_id: 'deploy-pr-to-dev.yml',
            ref: 'main',
            inputs: {
              pr_number: String(prNumber)
            }
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Deployment to staging triggered',
            stagingUrl: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com',
            workflowUrl: 'https://github.com/demian7575/aipm/actions'
          }));
        } catch (githubError) {
          console.error('GitHub Actions trigger error:', githubError);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: `Failed to trigger GitHub Actions: ${githubError.message}` 
          }));
        }
        
      } catch (error) {
        console.error('Deploy PR error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // Catch-all for other missing endpoints
  // Kiro live log endpoint
  if (url.pathname === '/api/kiro-live-log' && req.method === 'GET') {
    try {
      const logContent = readFileSync('/tmp/kiro-cli-live.log', 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        content: logContent,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        content: 'Log file not found or empty',
        timestamp: new Date().toISOString()
      }));
    }
    return;
  }

  // Generate code branch endpoint (frontend compatibility)
  if (url.pathname === '/api/generate-code-branch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { storyId, prNumber, prompt, originalBranch } = JSON.parse(body);
        
        console.log('🔧 Code generation request for PR:', prNumber);
        
        // Extract numeric story ID for MCP
        const numericStoryId = parseInt(storyId.toString().replace(/^US-/, ''), 10);
        
        // Use MCP for story data and git operations
        const kiroPrompt = `Read and follow the template file: ./templates/code-generation.md

Use MCP tool get_story with storyId: ${numericStoryId}
Use MCP tool git_prepare_branch with branchName: ${originalBranch}

Task Title: Code Generation for Story ${storyId}
Objective: ${prompt}
PR Number: ${prNumber}
Branch Name: ${originalBranch}
Language: javascript

Execute the template instructions exactly as written.`;

        console.log('📤 Calling Kiro CLI with code generation contract...');
        
        // Send to Kiro CLI
        const result = await sendToKiro(kiroPrompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true,
          message: 'Code generation started',
          prNumber: prNumber,
          branchName: originalBranch
        }));
      } catch (error) {
        console.error('❌ Generate code branch error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message,
          message: 'Code generation failed'
        }));
      }
    });
    return;
  }

  // Update Task Specification endpoint
  if (url.pathname === '/api/update-task-spec' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { storyId, updatedStory } = JSON.parse(body);
        
        console.log('📝 Updating Task Specification for story:', storyId);
        
        // Find existing Task Specification files
        const fs = await import('fs');
        const taskFiles = fs.readdirSync(WORK_DIR).filter(f => f.startsWith(`TASK-${storyId}`));
        
        if (taskFiles.length > 0) {
          // Update existing Task Specification file
          const taskFileName = taskFiles[0];
          const taskFilePath = `/${taskFileName}`;
          
          // Generate updated Task Specification content
          const updatedContent = generateTaskSpecContent(storyId, updatedStory);
          
          // Write updated content
          fs.writeFileSync(taskFilePath, updatedContent);
          
          // Commit the update to git if in a PR branch
          await commitTaskSpecUpdate(taskFileName, storyId);
          
          console.log(`✅ Updated Task Specification file: ${taskFileName}`);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true,
          message: 'Task Specification updated',
          storyId: storyId
        }));
      } catch (error) {
        console.error('❌ Update Task Specification error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message,
          message: 'Task Specification update failed'
        }));
      }
    });
    return;
  }

  const testDraftMatch = url.pathname.match(/^\/api\/stories\/(\d+)\/tests\/draft$/);
  if (testDraftMatch && req.method === 'POST') {
    const storyId = parseInt(testDraftMatch[1], 10);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { idea = '' } = body ? JSON.parse(body) : {};
        
        const prompt = `Read and follow the template file: ./templates/acceptance-test-generation.md

Story ID: ${storyId}
${idea ? `Idea: "${idea}"` : ''}

Execute the template instructions exactly as written.`;
        
        global.latestDraft = null;
        await sendToKiro(prompt);
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        if (global.latestDraft && (Date.now() - global.latestDraft.timestamp) < 30000) {
          const draft = global.latestDraft.draft;
          global.latestDraft = null;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(draft));
          return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ given: [], when: [], then: [] }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  const testDeleteMatch = url.pathname.match(/^\/api\/tests\/(\d+)$/);
  if (testDeleteMatch && req.method === 'DELETE') {
    const testId = parseInt(testDeleteMatch[1], 10);
    try {
      await dynamodb.send(new DeleteCommand({
        TableName: ACCEPTANCE_TESTS_TABLE,
        Key: { id: testId }
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    console.log('⚠️ Missing API endpoint:', req.method, url.pathname);
    res.writeHead(501, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Endpoint not implemented yet',
      method: req.method,
      path: url.pathname,
      message: 'This endpoint was not migrated from Lambda yet'
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    console.error('❌ Unhandled error in request handler:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
    }
  }
});

// Generate Task Specification content
function generateTaskSpecContent(storyId, updatedStory) {
  const timestamp = Date.now();
  return `# Story ${storyId} Implementation

This branch was created automatically for implementing story ${storyId}.

## Next Steps
1. Implement the required functionality
2. Add tests
3. Update documentation
4. Request review

## Story Details
Title: ${updatedStory.title || 'Development Task'}

As a: ${updatedStory.asA || 'user'}
I want: ${updatedStory.iWant || 'functionality'}
So that: ${updatedStory.soThat || 'value is provided'}

Description: ${updatedStory.description || 'Implementation details'}

Components: ${updatedStory.components ? updatedStory.components.join(', ') : 'WorkModel'}

Story Points: ${updatedStory.storyPoint || 'TBD'}

${updatedStory.acceptanceTests && updatedStory.acceptanceTests.length > 0 ? 
  `Acceptance Tests:\n${updatedStory.acceptanceTests.map((test, i) => 
    `${i + 1}. ${test.title}\n   Given: ${test.given}\n   When: ${test.when}\n   Then: ${test.then}`
  ).join('\n')}` : 
  'Acceptance Tests: To be defined'
}

---
Updated: ${new Date().toISOString()}
`;
}

// Commit Task Specification update
async function commitTaskSpecUpdate(taskFileName, storyId) {
  const execCommand = (cmd) => {
    return new Promise((resolve, reject) => {
      const [command, ...args] = cmd.split(' ');
      const proc = spawn(command, args, { cwd: WORK_DIR });
      
      let output = '';
      proc.stdout.on('data', (data) => output += data.toString());
      proc.stderr.on('data', (data) => output += data.toString());
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed: ${cmd}\n${output}`));
        }
      });
    });
  };

  try {
    // Check if we're in a git repository and on a branch
    const branchName = await execCommand('git branch --show-current');
    if (branchName.trim() && branchName.trim() !== 'main') {
      // Add and commit the updated Task Specification
      await execCommand(`git add ${taskFileName}`);
      await execCommand(`git commit -m "Update Task Specification for story ${storyId}"`);
      await execCommand(`git push origin ${branchName.trim()}`);
      console.log(`✅ Committed Task Specification update to branch: ${branchName.trim()}`);
    }
  } catch (error) {
    console.log('⚠️ Could not commit Task Specification update:', error.message);
  }
}

// Notify backend about PR updates
async function notifyBackendPRUpdate(storyId, newPRNumber, newPRUrl) {
  try {
    const response = await fetch('http://44.220.45.57/api/update-story-pr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storyId: storyId,
        prNumber: newPRNumber,
        prUrl: newPRUrl,
        action: 'conflict_resolved'
      })
    });
    
    if (response.ok) {
      console.log('✅ Notified backend about PR update');
    } else {
      console.log('⚠️ Failed to notify backend about PR update:', response.status);
    }
  } catch (error) {
    console.log('⚠️ Error notifying backend about PR update:', error.message);
  }
}

// Start Kiro process
startKiroProcess();

const PORT = process.env.KIRO_API_PORT || 8081;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Kiro API Server V4 (Full Stack)`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Stories: GET/POST http://localhost:${PORT}/api/stories`);
  console.log(`🔗 Draft: POST http://localhost:${PORT}/api/stories/draft`);
  console.log(`${'='.repeat(60)}\n`);
});
