#!/usr/bin/env node

import http from 'http';

async function testKiroV4StoryCreation() {
  console.log('🧪 Kiro V4 Story Creation Gating Test');
  console.log('=====================================');
  
  const testId = `test-${Date.now()}`;
  const callbackUrl = `http://44.220.45.57:3000/kiro-callback/${testId}`;
  
  try {
    // Test 1: Check V4 health
    console.log('1. Testing Kiro V4 health...');
    const healthResponse = await fetch('http://44.220.45.57:8081/health');
    if (!healthResponse.ok) {
      throw new Error(`V4 health check failed: ${healthResponse.status}`);
    }
    const health = await healthResponse.json();
    if (health.service !== 'V4') {
      throw new Error(`Expected V4, got: ${health.service}`);
    }
    console.log('✅ V4 is running');
    
    // Test 2: Send story creation request
    console.log('2. Sending story creation request...');
    const storyResponse = await fetch('http://44.220.45.57:8081/kiro/v4/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: 'Create Chile Story for testing',
        callbackUrl: callbackUrl
      })
    });
    
    if (!storyResponse.ok) {
      throw new Error(`Story request failed: ${storyResponse.status}`);
    }
    
    const storyResult = await storyResponse.json();
    if (!storyResult.success) {
      throw new Error(`Story request unsuccessful: ${storyResult.error}`);
    }
    console.log('✅ Story request accepted');
    
    // Test 3: Wait for callback (with timeout)
    console.log('3. Waiting for Kiro CLI to process and callback...');
    let callbackReceived = false;
    let attempts = 0;
    const maxAttempts = 360; // 360 seconds (6 minutes) for Kiro CLI processing
    
    while (!callbackReceived && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      try {
        const callbackResponse = await fetch(`http://44.220.45.57:3000/kiro-callback/${testId}`);
        if (callbackResponse.ok) {
          const result = await callbackResponse.json();
          if (result && result.title) {
            console.log('✅ Callback received with enhanced story');
            console.log(`   Title: ${result.title}`);
            console.log(`   Enhanced: ${result.enhanced || false}`);
            callbackReceived = true;
          }
        }
      } catch (error) {
        // Continue waiting
      }
      
      if (attempts % 10 === 0) {
        console.log(`   Still waiting... (${attempts}s)`);
      }
    }
    
    if (!callbackReceived) {
      throw new Error('Callback not received within 6 minutes');
    }
    
    console.log('🎉 ALL TESTS PASSED');
    console.log('Kiro V4 story creation is working correctly!');
    return true;
    
  } catch (error) {
    console.log('❌ TEST FAILED:', error.message);
    return false;
  }
}

// Polyfill fetch for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options = {}) => {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };
      
      const req = http.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data)
          });
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  };
}

testKiroV4StoryCreation().then(passed => {
  process.exit(passed ? 0 : 1);
});
