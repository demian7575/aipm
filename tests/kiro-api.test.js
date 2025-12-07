#!/usr/bin/env node
const KIRO_API_URL = process.env.KIRO_API_URL || 'http://localhost:8081';

async function test() {
  const res = await fetch(`${KIRO_API_URL}/health`);
  const data = await res.json();
  
  if (res.status !== 200 || data.status !== 'running') {
    throw new Error('Health check failed');
  }
  
  console.log('✅ Kiro REST API test passed');
  console.log(`   Status: ${data.status}, Active: ${data.activeRequests}`);
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
