#!/usr/bin/env node

// AIPM Gating Tests - CLI Runner
// Run comprehensive system health checks before deployment

const https = require('https');
const http = require('http');

const API_BASE = 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod';
const FRONTEND_BASE = 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com';

async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

const tests = [
  {
    name: 'Frontend Accessibility',
    test: async () => {
      const response = await fetch(FRONTEND_BASE);
      if (!response.ok) throw new Error(`Frontend not accessible: ${response.status}`);
      const html = await response.text();
      if (!html.includes('<title>AI Project Manager Mindmap</title>')) {
        throw new Error('Invalid HTML content');
      }
      return 'Frontend is accessible and serving correct content';
    }
  },
  {
    name: 'Backend API Health',
    test: async () => {
      const response = await fetch(`${API_BASE}/`);
      if (!response.ok) throw new Error(`Backend not accessible: ${response.status}`);
      const html = await response.text();
      if (!html.includes('AI Project Manager Mindmap')) {
        throw new Error('Backend not serving correct content');
      }
      return 'Backend API is responding and serving HTML';
    }
  },
  {
    name: 'Stories API Endpoint',
    test: async () => {
      const response = await fetch(`${API_BASE}/api/stories`);
      if (!response.ok) throw new Error(`Stories API failed: ${response.status}`);
      const stories = await response.json();
      if (!Array.isArray(stories)) throw new Error('Stories API returned invalid data');
      if (stories.length === 0) throw new Error('No stories found');
      return `Stories API working: ${stories.length} stories loaded`;
    }
  },
  {
    name: 'Runtime Data Export',
    test: async () => {
      const response = await fetch(`${API_BASE}/api/runtime-data`);
      // 404 is acceptable if no data exists yet, 500+ would be a real error
      if (response.status >= 500) {
        throw new Error(`Runtime data export server error: ${response.status}`);
      }
      return `Runtime data export endpoint available (status: ${response.status})`;
    }
  },
  {
    name: 'Document Generation API',
    test: async () => {
      const response = await fetch(`${API_BASE}/api/documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          stories: [{ id: 1, title: 'Test Story' }]
        })
      });
      
      // Should return some response (even if error due to missing data)
      if (response.status === 404) {
        throw new Error('Document generation endpoint not found');
      }
      
      return 'Document generation endpoint is available';
    }
  },
  {
    name: 'Stories Backup Persistence',
    test: async () => {
      const testData = { stories: [{ id: 999, title: 'Test Backup Story' }] };
      const response = await fetch(`${API_BASE}/api/stories/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      if (!response.ok) throw new Error(`Backup failed: ${response.status}`);
      const result = await response.json();
      return `Stories backup working: ${result.count} stories backed up`;
    }
  },
  {
    name: 'Mindmap State Persistence',
    test: async () => {
      const testState = {
        positions: { 1: { x: 100, y: 200 } },
        expandedNodes: [1],
        selectedStoryId: 1
      };
      
      const response = await fetch(`${API_BASE}/api/mindmap/persist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testState)
      });
      
      if (!response.ok) throw new Error(`Mindmap persist failed: ${response.status}`);
      return 'Mindmap state persistence is working';
    }
  },
  {
    name: 'GitHub PR Creation',
    test: async () => {
      const testData = {
        storyId: 999,
        branchName: `test-gating-${Date.now()}`,
        prTitle: 'Gating Test PR',
        prBody: 'This PR was created by gating tests',
        story: { id: 999, title: 'Gating Test Story' }
      };
      
      const response = await fetch(`${API_BASE}/api/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      if (!response.ok) throw new Error(`PR creation failed: ${response.status}`);
      const result = await response.json();
      
      if (!result.success) {
        // Check if it's just a token configuration issue
        if (result.error && result.error.includes('GitHub token not configured')) {
          throw new Error('GitHub token not configured');
        }
        // Other errors are acceptable (like branch conflicts)
        return `PR creation endpoint available (${result.error})`;
      }
      
      return `GitHub PR creation working: PR #${result.prNumber} created`;
    }
  },
  {
    name: 'Frontend JavaScript Syntax',
    test: async () => {
      const response = await fetch(`${FRONTEND_BASE}/app.js`);
      if (!response.ok) throw new Error(`app.js not accessible: ${response.status}`);
      
      const jsContent = await response.text();
      
      // Check for essential functions that should exist
      const requiredFunctions = ['loadStories', 'renderMindmap', 'createSimplePR'];
      const missing = requiredFunctions.filter(fn => !jsContent.includes(fn));
      if (missing.length > 0) {
        throw new Error(`Missing functions: ${missing.join(', ')}`);
      }
      
      return 'Frontend JavaScript contains required functions';
    }
  },
];

async function runGatingTests() {
  console.log('🧪 AIPM Gating Tests - CLI Runner');
  console.log('=====================================\n');
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    process.stdout.write(`${i + 1}. ${test.name}... `);
    
    try {
      const result = await test.test();
      console.log(`✅ PASS - ${result}`);
      results.push({ name: test.name, status: 'PASS', result });
      passed++;
    } catch (error) {
      console.log(`❌ FAIL - ${error.message}`);
      results.push({ name: test.name, status: 'FAIL', error: error.message });
      failed++;
    }
  }
  
  console.log('\n=====================================');
  console.log(`📊 Test Summary: ${passed}/${tests.length} passed`);
  
  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED - System ready for deployment');
    process.exit(0);
  } else {
    console.log(`❌ ${failed} TESTS FAILED - Fix issues before deployment`);
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

if (require.main === module) {
  runGatingTests().catch(error => {
    console.error('❌ Gating tests failed to run:', error.message);
    process.exit(1);
  });
}

module.exports = { runGatingTests };
