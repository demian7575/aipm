#!/usr/bin/env node

const https = require('https');
const http = require('http');

const ENVIRONMENTS = {
    production: {
        api: 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod',
        frontend: 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com'
    },
    development: {
        api: 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod',
        frontend: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com'
    }
};

async function testPostEndpoint(url, data, description) {
    return new Promise((resolve) => {
        const postData = JSON.stringify(data);
        const client = url.startsWith('https:') ? https : http;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const request = client.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                const success = res.statusCode === 200 || res.statusCode === 201;
                console.log(`   ${success ? '✅' : '❌'} ${description}: ${res.statusCode}`);
                resolve({ success, status: res.statusCode, data: responseData });
            });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(10000, () => {
            console.log(`   ❌ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        request.write(postData);
        request.end();
    });
}

async function testPutEndpoint(url, data, description) {
    return new Promise((resolve) => {
        const postData = JSON.stringify(data);
        const client = url.startsWith('https:') ? https : http;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const request = client.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                const success = res.statusCode === 200 || res.statusCode === 201;
                console.log(`   ${success ? '✅' : '❌'} ${description}: ${res.statusCode}`);
                resolve({ success, status: res.statusCode, data: responseData });
            });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(10000, () => {
            console.log(`   ❌ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        request.write(postData);
        request.end();
    });
}
    return new Promise((resolve) => {
        const client = url.startsWith('https:') ? https : http;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: 'GET'
        };
        
        const request = client.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                const success = res.statusCode === 200;
                console.log(`   ${success ? '✅' : '❌'} ${description}: ${res.statusCode}`);
                resolve({ success, status: res.statusCode, data: responseData });
            });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(10000, () => {
            console.log(`   ❌ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        request.end();
    });
}

async function testGetEndpoint(url, description) {
    return new Promise((resolve) => {
        const client = url.startsWith('https:') ? https : http;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: 'GET'
        };
        
        const request = client.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                const success = res.statusCode === 200;
                console.log(`   ${success ? '✅' : '❌'} ${description}: ${res.statusCode}`);
                resolve({ success, status: res.statusCode, data: responseData });
            });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(10000, () => {
            console.log(`   ❌ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        request.end();
    });
}

async function testFrontendFunction(url, functionName, description) {
    return new Promise((resolve) => {
        const client = url.startsWith('https:') ? https : http;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'GET'
        };
        
        const request = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                const hasFunction = data.includes(functionName);
                const success = res.statusCode === 200 && hasFunction;
                console.log(`   ${success ? '✅' : '❌'} ${description}: ${hasFunction ? 'Found' : 'Missing'}`);
                resolve({ success, hasFunction });
            });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(10000, () => {
            console.log(`   ❌ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        request.end();
    });
}

async function testAcceptanceTestWorkflow(apiUrl, description) {
    console.log(`   🧪 Testing ${description}...`);
    
    // Step 1: Create a test story
    const storyResult = await testPostEndpoint(`${apiUrl}/api/stories`, {
        title: 'Gating Test Story',
        description: 'Test story for acceptance test workflow',
        asA: 'Test User',
        iWant: 'to test acceptance test workflow',
        soThat: 'the gating tests pass',
        parentId: null
    }, 'Story Creation');
    
    if (!storyResult.success) {
        console.log(`   ❌ ${description}: Story creation failed`);
        return { success: false };
    }
    
    let storyId;
    try {
        const storyData = JSON.parse(storyResult.data);
        storyId = storyData.id;
    } catch (e) {
        console.log(`   ❌ ${description}: Invalid story response`);
        return { success: false };
    }
    
    // Step 2: Test acceptance test draft generation
    const draftResult = await testPostEndpoint(`${apiUrl}/api/stories/${storyId}/tests/draft`, {
        idea: 'test acceptance criteria'
    }, 'Acceptance Test Draft Generation');
    
    if (!draftResult.success) {
        console.log(`   ❌ ${description}: Draft generation failed`);
        return { success: false };
    }
    
    // Step 3: Create acceptance test manually
    const testResult = await testPostEndpoint(`${apiUrl}/api/stories/${storyId}/tests`, {
        given: ['Given I am a test user'],
        when: ['When I perform a test action'],
        then: ['Then the system should respond correctly within 2 seconds'],
        status: 'Draft',
        acceptWarnings: true
    }, 'Manual Acceptance Test Creation');
    
    if (!testResult.success) {
        console.log(`   ❌ ${description}: Manual test creation failed`);
        return { success: false };
    }
    
    // Step 4: Verify story shows acceptance tests
    const storiesResult = await testGetEndpoint(`${apiUrl}/api/stories`, 'Stories with Acceptance Tests');
    
    if (!storiesResult.success) {
        console.log(`   ❌ ${description}: Stories retrieval failed`);
        return { success: false };
    }
    
    let hasAcceptanceTests = false;
    try {
        const stories = JSON.parse(storiesResult.data);
        const testStory = stories.find(s => s.id === storyId);
        hasAcceptanceTests = testStory && testStory.acceptanceTests && testStory.acceptanceTests.length > 0;
    } catch (e) {
        console.log(`   ❌ ${description}: Invalid stories response`);
        return { success: false };
    }
    
    if (!hasAcceptanceTests) {
        console.log(`   ❌ ${description}: Story missing acceptance tests`);
        return { success: false };
    }
    
    console.log(`   ✅ ${description}: Complete workflow verified`);
    return { success: true };
}

async function testStoryCompletionValidation(apiUrl, description) {
    console.log(`   🧪 Testing ${description}...`);
    
    // Create a story with acceptance test
    const storyResult = await testPostEndpoint(`${apiUrl}/api/stories`, {
        title: 'Completion Test Story',
        description: 'Test story for completion validation',
        asA: 'Test User',
        iWant: 'to test story completion',
        soThat: 'validation works correctly',
        parentId: null
    }, 'Story Creation for Completion Test');
    
    if (!storyResult.success) {
        console.log(`   ❌ ${description}: Story creation failed`);
        return { success: false };
    }
    
    let storyId;
    try {
        const storyData = JSON.parse(storyResult.data);
        storyId = storyData.id;
    } catch (e) {
        console.log(`   ❌ ${description}: Invalid story response`);
        return { success: false };
    }
    
    // Create acceptance test in Draft status
    const testResult = await testPostEndpoint(`${apiUrl}/api/stories/${storyId}/tests`, {
        given: ['Given I have a draft test'],
        when: ['When I try to complete the story'],
        then: ['Then it should be blocked'],
        status: 'Draft',
        acceptWarnings: true
    }, 'Draft Test Creation');
    
    if (!testResult.success) {
        console.log(`   ❌ ${description}: Test creation failed`);
        return { success: false };
    }
    
    // Try to mark story as Done (should fail)
    const updateResult = await testPutEndpoint(`${apiUrl}/api/stories/${storyId}`, {
        title: 'Completion Test Story',
        description: 'Test story for completion validation',
        asA: 'Test User',
        iWant: 'to test story completion',
        soThat: 'validation works correctly',
        status: 'Done'
    }, 'Story Completion (Should Fail)');
    
    // This should fail with 409 status
    const completionBlocked = updateResult.status === 409;
    
    if (!completionBlocked) {
        console.log(`   ❌ ${description}: Story completion should be blocked but wasn't`);
        return { success: false };
    }
    
    console.log(`   ✅ ${description}: Story completion properly blocked`);
    return { success: true };
}

async function runEnvironmentTests(env, config) {
    console.log(`\n🧪 Testing ${env.toUpperCase()} Environment - Comprehensive Validation`);
    console.log(`   API: ${config.api}`);
    console.log(`   Frontend: ${config.frontend}`);
    console.log('');
    
    const testPromises = [
        testGetEndpoint(`${config.frontend}/config.js`, 'Frontend Config'),
        testGetEndpoint(`${config.frontend}/index.html`, 'Frontend Index'),
        testGetEndpoint(`${config.frontend}/production-gating-tests.html`, 'Gating Tests Page'),
        testGetEndpoint(`${config.frontend}/app.js`, 'Frontend App.js'),
        testGetEndpoint(`${config.frontend}/production-gating-tests.js`, 'Gating Tests Script'),
        testGetEndpoint(`${config.api}/api/stories`, 'API Stories'),
        testFrontendFunction(`${config.frontend}/app.js`, 'openKiroTerminalModal', 'Kiro Terminal Modal Function'),
        testFrontendFunction(`${config.frontend}/app.js`, 'openAcceptanceTestModal', 'Acceptance Test Modal Function'),
        testFrontendFunction(`${config.frontend}/app.js`, 'createAcceptanceTest', 'Create Acceptance Test Function'),
        testFrontendFunction(`${config.frontend}/app.js`, 'isSubmitting', 'Duplicate Prevention Flag'),
        testAcceptanceTestWorkflow(config.api, 'Acceptance Test Workflow'),
        testStoryCompletionValidation(config.api, 'Story Completion Validation')
    ];
    
    // Add draft generation only for production
    if (env !== 'development') {
        testPromises.push(
            testPostEndpoint(`${config.api}/api/stories/draft`, 
                { idea: 'test story', parentId: null }, 'API Draft Generation')
        );
    }
    
    const results = await Promise.all(testPromises);
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`\n📊 ${env.toUpperCase()} Results: ${passed}/${total} tests passed`);
    if (passed === total) {
        console.log(`✅ ${env.toUpperCase()} environment: ALL TESTS PASSED`);
    } else {
        console.log(`❌ ${env.toUpperCase()} environment: ${total - passed} tests failed`);
    }
    
    return { passed, total, success: passed === total };
}

async function main() {
    console.log('🚀 AIPM Comprehensive Gating Tests - All Functionality\n');
    
    const results = {};
    
    for (const [env, config] of Object.entries(ENVIRONMENTS)) {
        results[env] = await runEnvironmentTests(env, config);
    }
    
    console.log('\n======================================================================');
    console.log('📋 COMPREHENSIVE GATING TEST SUMMARY');
    console.log('======================================================================');
    
    let allPassed = true;
    for (const [env, result] of Object.entries(results)) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${env.toUpperCase().padEnd(12)}: ${status} (${result.passed}/${result.total})`);
        if (!result.success) allPassed = false;
    }
    
    console.log('======================================================================');
    if (allPassed) {
        console.log('🎉 ALL FUNCTIONALITY TESTS PASSING');
        console.log('✅ All environments ready for production');
        process.exit(0);
    } else {
        console.log('⚠️  SOME TESTS FAILING');
        console.log('❌ Requires fixes before production deployment');
        process.exit(1);
    }
}

main().catch(console.error);
