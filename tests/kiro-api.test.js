#!/usr/bin/env node
const KIRO_API_URL = 'http://localhost:8081';

(async () => {
  const res = await fetch(`${KIRO_API_URL}/health`);
  const data = await res.json();
  
  if (res.status !== 200 || data.status !== 'running') throw new Error('Failed');
  
  console.log('✅ Test passed');
  console.log(`Status: ${data.status}, Active: ${data.activeRequests}`);
})().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
