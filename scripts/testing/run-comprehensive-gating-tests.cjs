#!/usr/bin/env node

const https = require('https');
const http = require('http');

const ENVIRONMENTS = {
    production: {
        api: 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod',
        frontend: 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com'
    },
    development: {
        api: 'https://eppae4ae82.execute-api.us-east-1.amazonaws.com/dev',
        frontend: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com'
    }
};

async function testEndpoint(url, description, method = 'GET', data = null) {
    return new Promise((resolve) => {
        const client = url.startsWith('https:') ? https : http;
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AIPM-Gating-Test/1.0'
            }
        };
        
        if (data && method === 'POST') {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }
        
        const request = client.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
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
        
        if (data && method === 'POST') {
            request.write(JSON.stringify(data));
        }
        
        request.end();
    });
}

async function testEnvironment(envName, config) {
    console.log(`\n🧪 Testing ${envName.toUpperCase()} Environment - Comprehensive Validation`);
    console.log(`   API: ${config.api}`);
    console.log(`   Frontend: ${config.frontend}`);
    console.log('');
    
    let passed = 0;
    let total = 0;
    
    // Test frontend assets
    const frontendTests = [
        { url: `${config.frontend}/`, desc: 'Frontend Index' },
        { url: `${config.frontend}/app.js`, desc: 'Frontend App.js' },
        { url: `${config.frontend}/config.js`, desc: 'Frontend Config' },
        { url: `${config.frontend}/gating-tests.html`, desc: 'Gating Tests Page' },
        { url: `${config.frontend}/gating-tests.js`, desc: 'Gating Tests Script' }
    ];
    
    for (const test of frontendTests) {
        const result = await testEndpoint(test.url, test.desc);
        total++;
        if (result.success) passed++;
    }
    
    // Test API endpoints
    const apiTests = [
        { url: `${config.api}/api/stories`, desc: 'API Stories' },
        { url: `${config.api}/api/stories/draft`, desc: 'API Draft Generation', method: 'POST', data: { idea: 'test' } }
    ];
    
    for (const test of apiTests) {
        const result = await testEndpoint(test.url, test.desc, test.method, test.data);
        total++;
        if (result.success) passed++;
    }
    
    // Test Kiro Terminal Modal Function (frontend-specific)
    const modalTest = await testEndpoint(`${config.frontend}/app.js`, 'Kiro Terminal Modal Function');
    if (modalTest.success && modalTest.data.includes('Connecting to Kiro CLI terminal')) {
        console.log('   ✅ Kiro Terminal Modal Function: Found');
        passed++;
    } else {
        console.log('   ❌ Kiro Terminal Modal Function: Not Found');
    }
    total++;
    
    console.log(`\n📊 ${envName.toUpperCase()} Results: ${passed}/${total} tests passed`);
    console.log(`${passed === total ? '✅' : '❌'} ${envName.toUpperCase()} environment: ${passed === total ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
    return { passed, total, success: passed === total };
}

async function main() {
    console.log('🚀 AIPM Comprehensive Gating Tests - All Functionality\n');
    
    let totalPassed = 0;
    let totalTests = 0;
    let envResults = {};
    
    // Test each environment
    for (const [envName, config] of Object.entries(ENVIRONMENTS)) {
        const result = await testEnvironment(envName, config);
        envResults[envName] = result;
        totalPassed += result.passed;
        totalTests += result.total;
    }
    
    // Summary
    console.log('\n======================================================================');
    console.log('📋 COMPREHENSIVE GATING TEST SUMMARY');
    console.log('======================================================================');
    
    for (const [envName, result] of Object.entries(envResults)) {
        console.log(`${envName.toUpperCase().padEnd(12)}: ${result.success ? '✅' : '❌'} PASS (${result.passed}/${result.total})`);
    }
    
    console.log('======================================================================');
    
    if (totalPassed === totalTests) {
        console.log('🎉 ALL FUNCTIONALITY TESTS PASSING');
        console.log('✅ All environments ready for production');
        process.exit(0);
    } else {
        console.log('⚠️  SOME FUNCTIONALITY TESTS FAILING');
        console.log('❌ Fix issues before deployment');
        process.exit(1);
    }
}

main().catch(console.error);
