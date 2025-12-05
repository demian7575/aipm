#!/usr/bin/env node
// Example: Using Kiro API Server

const KIRO_API_URL = process.env.KIRO_API_URL || 'http://localhost:8081';

async function callKiroAPI(prompt, context = '') {
  const response = await fetch(`${KIRO_API_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context, timeoutMs: 120000 })
  });
  
  return await response.json();
}

// Example 1: Generate user story
async function generateStory() {
  console.log('📝 Generating user story...\n');
  
  const result = await callKiroAPI(
    'Generate a user story for adding an export button. Respond with JSON: {"title": "...", "description": "..."}',
    'Working on AIPM project. Follow INVEST principles.'
  );
  
  console.log('Result:', result.success ? '✅' : '❌');
  if (result.result) {
    console.log('JSON:', result.result);
  }
  console.log('\n');
}

// Example 2: Code generation
async function generateCode() {
  console.log('💻 Generating code...\n');
  
  const result = await callKiroAPI(
    'Add a button labeled "Export Data" to apps/frontend/public/app.js in the Development Tasks section',
    'Working on AIPM. Repository at /home/ec2-user/aipm'
  );
  
  console.log('Result:', result.success ? '✅' : '❌');
  console.log('Output length:', result.output?.length || 0, 'chars');
  console.log('\n');
}

// Example 3: Health check
async function checkHealth() {
  console.log('🏥 Checking health...\n');
  
  const response = await fetch(`${KIRO_API_URL}/health`);
  const health = await response.json();
  
  console.log('Status:', health.status);
  console.log('Active requests:', health.activeRequests);
  console.log('Uptime:', Math.round(health.uptime), 'seconds');
  console.log('\n');
}

// Run examples
(async () => {
  try {
    await checkHealth();
    // await generateStory();
    // await generateCode();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
