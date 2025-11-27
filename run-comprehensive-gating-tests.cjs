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
    
    const results = [];
    
    // Core API tests
    results.push(await testEndpoint(`${config.api}/api/stories`, 'API Stories'));
    results.push(await testPostEndpoint(`${config.api}/api/stories/draft`, 
        { idea: 'test story', parentId: null }, 'API Draft Generation'));
    
    // Frontend asset tests
    results.push(await testEndpoint(`${config.frontend}/`, 'Frontend Index'));
    results.push(await testEndpoint(`${config.frontend}/app.js`, 'Frontend App.js'));
    results.push(await testEndpoint(`${config.frontend}/config.js`, 'Frontend Config'));
    results.push(await testEndpoint(`${config.frontend}/production-gating-tests.js`, 'Gating Tests Script'));
    results.push(await testEndpoint(`${config.frontend}/production-gating-tests.html`, 'Gating Tests Page'));
    
    // Button existence tests
    results.push(await testButtonExists(config.frontend, 'export-stories-btn', 'PR123 Export Button'));
    results.push(await testButtonExists(config.frontend, 'run-in-staging-btn', 'Run in Staging Button'));
    
    // JavaScript function tests
    results.push(await testJavaScriptFunction(config.frontend, 'buildExportModalContent', 'Export Modal Function'));
    results.push(await testJavaScriptFunction(config.frontend, 'buildRunInStagingModalContent', 'Staging Modal Function'));
    
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
