#!/usr/bin/env node

// Test API endpoints for button separation
import http from 'http';

console.log('🧪 Testing API Endpoints');
console.log('========================');

function testEndpoint(path, data, expectedStatus = 200) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: responseData,
          success: res.statusCode === expectedStatus
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        data: err.message,
        success: false
      });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  // Test Generate Code endpoint
  console.log('\n📋 Test 1: /api/generate-code endpoint');
  const generateCodeResult = await testEndpoint('/api/generate-code', {
    storyId: 'test-123',
    taskTitle: 'Test Task',
    objective: 'Test objective',
    constraints: 'Test constraints',
    acceptanceCriteria: 'Test criteria'
  }, 503); // Expecting 503 in serverless environment
  
  console.log(`   Status: ${generateCodeResult.status}`);
  console.log(`   ✅ Generate Code endpoint: ${generateCodeResult.status === 503 ? 'WORKING (Expected 503)' : 'UNEXPECTED'}`);

  // Test Create PR endpoint  
  console.log('\n📋 Test 2: /api/create-pr endpoint');
  const createPRResult = await testEndpoint('/api/create-pr', {
    storyId: 'test-123',
    branchName: 'test-branch',
    prTitle: 'Test PR',
    prBody: 'Test PR body'
  }, 400); // Expecting 400 due to missing GitHub token
  
  console.log(`   Status: ${createPRResult.status}`);
  console.log(`   ✅ Create PR endpoint: ${createPRResult.status === 400 ? 'WORKING (Expected 400)' : 'UNEXPECTED'}`);

  // Summary
  const allWorking = generateCodeResult.status === 503 && createPRResult.status === 400;
  
  console.log('\n========================');
  console.log(`📊 API Test Results: ${allWorking ? 'PASSED' : 'FAILED'}`);
  
  if (allWorking) {
    console.log('✅ Both API endpoints are responding correctly!');
    console.log('   - Generate Code returns 503 (expected in serverless)');
    console.log('   - Create PR returns 400 (expected without GitHub token)');
  } else {
    console.log('❌ API endpoints not responding as expected');
  }
  
  process.exit(allWorking ? 0 : 1);
}

// Wait a moment for server to be ready, then run tests
setTimeout(runTests, 2000);
