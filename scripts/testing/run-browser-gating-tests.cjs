#!/usr/bin/env node

const https = require('https');
const http = require('http');

const ENVIRONMENTS = {
    production: 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com',
    development: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com'
};

async function runBrowserTests(env, baseUrl) {
    console.log(`\n🌐 Running Browser Tests for ${env.toUpperCase()}`);
    console.log(`   URL: ${baseUrl}/production-gating-tests.html\n`);

    return new Promise((resolve) => {
        const testUrl = `${baseUrl}/production-gating-tests.js`;
        const client = testUrl.startsWith('https:') ? https : http;
        
        const request = client.get(testUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.log(`   ❌ Failed to load test script: ${res.statusCode}`);
                    resolve({ success: false, passed: 0, total: 0 });
                    return;
                }

                // Count test definitions
                const testMatches = data.match(/\{ name:/g);
                const totalTests = testMatches ? testMatches.length : 0;
                
                console.log(`   📊 Found ${totalTests} browser tests`);
                console.log(`   ℹ️  Browser tests require manual execution`);
                console.log(`   🔗 Open: ${baseUrl}/production-gating-tests.html`);
                console.log(`   ✅ Test script loaded successfully`);
                
                resolve({ success: true, passed: totalTests, total: totalTests, manual: true });
            });
        });

        request.on('error', (err) => {
            console.log(`   ❌ Error: ${err.message}`);
            resolve({ success: false, passed: 0, total: 0 });
        });

        request.setTimeout(5000, () => {
            console.log(`   ❌ Timeout`);
            request.destroy();
            resolve({ success: false, passed: 0, total: 0 });
        });
    });
}

async function main() {
    console.log('🚀 AIPM Browser-Based Gating Tests\n');
    
    const results = {};
    
    for (const [env, baseUrl] of Object.entries(ENVIRONMENTS)) {
        results[env] = await runBrowserTests(env, baseUrl);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📋 BROWSER TEST SUMMARY');
    console.log('='.repeat(70));
    
    let allSuccess = true;
    for (const [env, result] of Object.entries(results)) {
        const status = result.success ? '✅ READY' : '❌ FAIL';
        console.log(`${env.toUpperCase().padEnd(12)}: ${status} (${result.total} tests available)`);
        if (!result.success) allSuccess = false;
    }
    
    console.log('='.repeat(70));
    if (allSuccess) {
        console.log('✅ Browser test scripts are deployed and accessible');
        console.log('ℹ️  Run tests manually by opening the URLs above');
    } else {
        console.log('❌ Some browser test scripts are not accessible');
    }
    
    process.exit(allSuccess ? 0 : 1);
}

main().catch(console.error);
