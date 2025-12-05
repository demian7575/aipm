#!/usr/bin/env node
// Kiro API Gating Tests - Functional Requirements Validation

const http = require('http');

const KIRO_API_URL = process.env.KIRO_API_URL || 'http://44.220.45.57:8081';

async function testGet(path, description) {
    return new Promise((resolve) => {
        const url = new URL(path, KIRO_API_URL);
        const request = http.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({ 
                    success: res.statusCode === 200, 
                    status: res.statusCode,
                    body,
                    headers: res.headers
                });
            });
        });
        
        request.on('error', (err) => {
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(5000, () => {
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
    });
}

async function testPost(path, data, description, expectedStatus = 200) {
    return new Promise((resolve) => {
        const url = new URL(path, KIRO_API_URL);
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const request = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({ 
                    success: res.statusCode === expectedStatus, 
                    status: res.statusCode,
                    body
                });
            });
        });
        
        request.on('error', (err) => {
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(10000, () => {
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        request.write(postData);
        request.end();
    });
}

async function testOptions(path, description) {
    return new Promise((resolve) => {
        const url = new URL(path, KIRO_API_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'OPTIONS'
        };
        
        const request = http.request(options, (res) => {
            resolve({ 
                success: res.statusCode === 204, 
                status: res.statusCode,
                headers: res.headers
            });
        });
        
        request.on('error', (err) => {
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(5000, () => {
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        request.end();
    });
}

async function runTests() {
    console.log('🧪 Kiro API Gating Tests');
    console.log(`API: ${KIRO_API_URL}\n`);
    
    const tests = [];
    
    // FR-2.1: Health endpoint returns status
    console.log('📋 Testing Health Endpoint...');
    const healthResult = await testGet('/health', 'Health check');
    
    if (healthResult.success) {
        const body = JSON.parse(healthResult.body);
        
        tests.push({
            name: 'FR-2.1: Health returns 200',
            pass: true
        });
        
        tests.push({
            name: 'FR-2.1: Health includes status=running',
            pass: body.status === 'running'
        });
        
        tests.push({
            name: 'FR-2.1: Health includes activeRequests',
            pass: typeof body.activeRequests === 'number'
        });
        
        tests.push({
            name: 'FR-2.1: Health includes queuedRequests',
            pass: typeof body.queuedRequests === 'number'
        });
        
        tests.push({
            name: 'FR-2.1: Health includes maxConcurrent',
            pass: body.maxConcurrent === 2
        });
        
        tests.push({
            name: 'FR-2.1: Health includes uptime',
            pass: typeof body.uptime === 'number'
        });
    } else {
        tests.push({
            name: 'FR-2.1: Health endpoint',
            pass: false,
            error: healthResult.error || `Status ${healthResult.status}`
        });
    }
    
    // FR-1.2: Reject missing prompt
    console.log('📋 Testing Request Validation...');
    const noPromptResult = await testPost('/execute', { context: 'test' }, 'No prompt', 400);
    tests.push({
        name: 'FR-1.2: Reject missing prompt (400)',
        pass: noPromptResult.success && noPromptResult.body.includes('prompt required')
    });
    
    // FR-4.1: Handle OPTIONS request
    console.log('📋 Testing CORS...');
    const optionsResult = await testOptions('/execute', 'OPTIONS');
    tests.push({
        name: 'FR-4.1: OPTIONS returns 204',
        pass: optionsResult.success
    });
    
    // FR-4.2: CORS headers
    tests.push({
        name: 'FR-4.2: CORS headers present',
        pass: healthResult.headers && 'access-control-allow-origin' in healthResult.headers
    });
    
    // FR-1.1: Accept valid request
    console.log('📋 Testing Valid Request...');
    const validResult = await testPost('/execute', 
        { prompt: 'echo test', timeoutMs: 5000 }, 
        'Valid request', 200);
    tests.push({
        name: 'FR-1.1: Accept valid request (200)',
        pass: validResult.success
    });
    
    // FR-5.1: Handle invalid JSON (send raw string)
    console.log('📋 Testing Error Handling...');
    const invalidJsonResult = await new Promise((resolve) => {
        const url = new URL('/execute', KIRO_API_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        
        const request = http.request(options, (res) => {
            resolve({ success: res.statusCode >= 400, status: res.statusCode });
        });
        
        request.on('error', () => resolve({ success: true }));
        request.setTimeout(5000, () => {
            request.destroy();
            resolve({ success: false });
        });
        
        request.write('{invalid json}');
        request.end();
    });
    
    tests.push({
        name: 'FR-5.1: Handle invalid JSON',
        pass: invalidJsonResult.success
    });
    
    // Print results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Kiro API Gating Test Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let passed = 0;
    let failed = 0;
    
    tests.forEach(test => {
        if (test.pass) {
            console.log(`   ✅ ${test.name}`);
            passed++;
        } else {
            console.log(`   ❌ ${test.name}${test.error ? ': ' + test.error : ''}`);
            failed++;
        }
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED');
        process.exit(0);
    } else {
        console.log('⚠️  SOME TESTS FAILED');
        process.exit(1);
    }
}

// Export for integration with comprehensive tests
if (require.main === module) {
    runTests().catch(console.error);
} else {
    module.exports = { runTests, testGet, testPost, testOptions };
}
