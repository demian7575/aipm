#!/usr/bin/env node
// Kiro REST API Integration Test

const KIRO_API_URL = process.env.KIRO_API_URL || 'http://localhost:8081';

async function testHealth() {
  const response = await fetch(`${KIRO_API_URL}/health`);
  const data = await response.json();
  
  if (response.status !== 200) throw new Error('Health check failed');
  if (data.status !== 'running') throw new Error('Server not running');
  
  return data;
}

async function testExecute() {
  const response = await fetch(`${KIRO_API_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'echo "test"',
      context: '',
      timeoutMs: 30000
    })
  });
  
  const data = await response.json();
  
  if (response.status !== 200) throw new Error('Execute failed');
  if (!data.output) throw new Error('No output returned');
  
  return data;
}

async function runTests() {
  console.log('🧪 Kiro REST API Integration Tests\n');
  
  try {
    console.log('1️⃣  Testing health endpoint...');
    const health = await testHealth();
    console.log('✅ Health check passed');
    console.log(`   Status: ${health.status}`);
    console.log(`   Active: ${health.activeRequests}`);
    console.log(`   Queued: ${health.queuedRequests}\n`);
    
    console.log('2️⃣  Testing execute endpoint...');
    const result = await testExecute();
    console.log('✅ Execute test passed');
    console.log(`   Success: ${result.success}`);
    console.log(`   Output length: ${result.output?.length || 0} chars\n`);
    
    console.log('✅ All tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
