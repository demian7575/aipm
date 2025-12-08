#!/usr/bin/env node
const KIRO_API_URL = 'http://localhost:8081';

(async () => {
  const res = await fetch(`${KIRO_API_URL}/health`);
  const data = await res.json();
  
  if (res.status !== 200 || data.status !== 'running') throw new Error('Failed');
  
  console.log('✅ Test passed');
})().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
