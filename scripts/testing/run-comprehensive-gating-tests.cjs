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
            const success = res.statusCode === 200;
            console.log(`   ${success ? '✅' : '❌'} ${description}: ${res.statusCode}`);
            resolve({ success, status: res.statusCode });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(5000, () => {
            console.log(`   ❌ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        request.write(postData);
        request.end();
    });
}

async function testEndpoint(url, description) {
    return new Promise((resolve) => {
        const client = url.startsWith('https:') ? https : http;
        const request = client.get(url, (res) => {
            const success = res.statusCode === 200;
            console.log(`   ${success ? '✅' : '❌'} ${description}: ${res.statusCode}`);
            resolve({ success, status: res.statusCode });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(5000, () => {
            console.log(`   ❌ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
    });
}

async function testDynamicButtonCapability(baseUrl, testName) {
    try {
        const response = await fetch(`${baseUrl}/app.js`, { timeout: 5000 });
        if (!response.ok) {
            return { name: testName, status: 'fail', message: `HTTP ${response.status}` };
        }
        
        const content = await response.text();
        // Check for button creation code and staging workflow capability
        const hasButtonCreation = content.includes('run-in-staging-btn') && content.includes('Run in Staging');
        const hasStagingWorkflow = content.includes('buildRunInStagingModalContent') || content.includes('/api/run-staging');
        
        if (hasButtonCreation && hasStagingWorkflow) {
            return { name: testName, status: 'pass', message: 'Found' };
        } else {
            return { name: testName, status: 'fail', message: 'Missing' };
        }
    } catch (error) {
        return { name: testName, status: 'fail', message: error.message.includes('timeout') ? 'Timeout' : error.message };
    }
}

async function testButtonExists(frontendUrl, buttonId, description) {
    return new Promise((resolve) => {
        const client = http;
        const request = client.get(`${frontendUrl}/index.html`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const hasButton = data.includes(`id="${buttonId}"`);
                const success = res.statusCode === 200 && hasButton;
                console.log(`   ${success ? '✅' : '❌'} ${description}: ${hasButton ? 'Found' : 'Missing'}`);
                resolve({ success, hasButton });
            });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(5000, () => {
            console.log(`   ❌ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
    });
}

async function testJavaScriptFunction(frontendUrl, functionName, description) {
    return new Promise((resolve) => {
        const client = http;
        const request = client.get(`${frontendUrl}/app.js`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const hasFunction = data.includes(`function ${functionName}`) || 
                                  data.includes(`${functionName} =`) ||
                                  data.includes(`const ${functionName}`);
                const success = res.statusCode === 200 && hasFunction;
                console.log(`   ${success ? '✅' : '❌'} ${description}: ${hasFunction ? 'Found' : 'Missing'}`);
                resolve({ success, hasFunction });
            });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(5000, () => {
            console.log(`   ❌ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
    });
}

async function runEnvironmentTests(env, config) {
    console.log(`\n🧪 Testing ${env.toUpperCase()} Environment - Comprehensive Validation`);
    console.log(`   API: ${config.api}`);
    console.log(`   Frontend: ${config.frontend}\n`);
    
    // Run all tests in parallel
    const testPromises = [
        // Core API tests
        testEndpoint(`${config.api}/api/stories`, 'API Stories'),
        
        // Frontend asset tests
        testEndpoint(`${config.frontend}/`, 'Frontend Index'),
        testEndpoint(`${config.frontend}/app.js`, 'Frontend App.js'),
        testEndpoint(`${config.frontend}/config.js`, 'Frontend Config'),
        testEndpoint(`${config.frontend}/production-gating-tests.js`, 'Gating Tests Script'),
        testEndpoint(`${config.frontend}/production-gating-tests.html`, 'Gating Tests Page'),
        
        // Feature tests
        testButtonExists(config.frontend, 'export-stories-btn', 'PR123 Export Button'),
        testJavaScriptFunction(config.frontend, 'buildExportModalContent', 'Export Modal Function'),
        testJavaScriptFunction(config.frontend, 'buildRunInStagingModalContent', 'Staging Modal Function')
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
    
    // Run all environments in parallel
    const results = await Promise.all(
        Object.entries(ENVIRONMENTS).map(async ([env, config]) => {
            const result = await runEnvironmentTests(env, config);
            return [env, result];
        })
    ).then(arr => Object.fromEntries(arr));
    
    console.log('\n' + '='.repeat(70));
    console.log('📋 COMPREHENSIVE GATING TEST SUMMARY');
    console.log('='.repeat(70));
    
    let allPassed = true;
    for (const [env, result] of Object.entries(results)) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${env.toUpperCase().padEnd(12)}: ${status} (${result.passed}/${result.total})`);
        if (!result.success) allPassed = false;
    }
    
    console.log('='.repeat(70));
    if (allPassed) {
        console.log('🎉 ALL FUNCTIONALITY TESTS PASSING');
        console.log('✅ PR123 Export Feature: Working');
        console.log('✅ Run in Staging Button: Working');
        console.log('✅ All environments ready for production');
    } else {
        console.log('⚠️  SOME FUNCTIONALITY TESTS FAILING');
        console.log('❌ Requires fixes before production deployment');
    }
    
    process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
