#!/usr/bin/env node

// Test config loading in browser context
const { spawn } = require('child_process');

console.log('🧪 Testing Config Loading in Browser Context...\n');

const testScript = `
// Test config loading
setTimeout(() => {
  console.log('=== CONFIG TEST RESULTS ===');
  console.log('window.CONFIG exists:', !!window.CONFIG);
  if (window.CONFIG) {
    console.log('API_BASE_URL:', window.CONFIG.API_BASE_URL);
    console.log('ENVIRONMENT:', window.CONFIG.ENVIRONMENT);
  } else {
    console.log('❌ CONFIG NOT LOADED');
  }
  console.log('=== END CONFIG TEST ===');
}, 2000);
`;

// Create a test HTML file
const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Config Test</title>
</head>
<body>
  <h1>Config Loading Test</h1>
  <script src="http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/config.js"></script>
  <script>
    ${testScript}
  </script>
</body>
</html>
`;

require('fs').writeFileSync('/tmp/config-test.html', testHtml);

console.log('✅ Config loading test created');
console.log('📋 Manual test: Open http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com in browser');
console.log('📋 Check browser console for CONFIG object');
console.log('📋 Try "Run in Staging" workflow after page loads completely');
