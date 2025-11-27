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

async function runEnvironmentTests(env, config) {
    console.log(`\n🧪 Testing ${env.toUpperCase()} Environment`);
    console.log(`   API: ${config.api}`);
    console.log(`   Frontend: ${config.frontend}\n`);
    
    const results = [];
    
    // Test API endpoints
    results.push(await testEndpoint(`${config.api}/api/stories`, 'API Stories'));
    results.push(await testPostEndpoint(`${config.api}/api/stories/draft`, 
        { idea: 'test story', parentId: null }, 'API Draft Generation'));
    
    // Test frontend assets
    results.push(await testEndpoint(`${config.frontend}/`, 'Frontend Index'));
    results.push(await testEndpoint(`${config.frontend}/config.js`, 'Frontend Config'));
    results.push(await testEndpoint(`${config.frontend}/production-gating-tests.js`, 'Gating Tests Script'));
    results.push(await testEndpoint(`${config.frontend}/production-gating-tests.html`, 'Gating Tests Page'));
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`\n📊 ${env.toUpperCase()} Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log(`✅ ${env.toUpperCase()} environment: ALL TESTS PASSED`);
        console.log(`🌐 Gating Tests URL: ${config.frontend}/production-gating-tests.html`);
    } else {
        console.log(`❌ ${env.toUpperCase()} environment: ${total - passed} tests failed`);
    }
    
    return { passed, total, success: passed === total };
}

async function main() {
    console.log('🚀 AIPM Gating Tests - Multi-Environment Validation\n');
    
    const results = {};
    
    for (const [env, config] of Object.entries(ENVIRONMENTS)) {
        results[env] = await runEnvironmentTests(env, config);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 FINAL SUMMARY');
    console.log('='.repeat(60));
    
    let allPassed = true;
    for (const [env, result] of Object.entries(results)) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${env.toUpperCase().padEnd(12)}: ${status} (${result.passed}/${result.total})`);
        if (!result.success) allPassed = false;
    }
    
    console.log('='.repeat(60));
    console.log(allPassed ? '🎉 ALL ENVIRONMENTS PASSING' : '⚠️  SOME ENVIRONMENTS FAILING');
    
    process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
