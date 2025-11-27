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

async function testPR123Functionality(frontendUrl) {
    return new Promise((resolve) => {
        const client = http;
        const request = client.get(`${frontendUrl}/index.html`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const hasExportButton = data.includes('export-stories-btn');
                const success = res.statusCode === 200 && hasExportButton;
                console.log(`   ${success ? '✅' : '❌'} PR123 Export Button: ${hasExportButton ? 'Found' : 'Missing'}`);
                resolve({ success, hasButton: hasExportButton });
            });
        });
        
        request.on('error', (err) => {
            console.log(`   ❌ PR123 Export Button: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(5000, () => {
            console.log(`   ❌ PR123 Export Button: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
    });
}

async function runEnvironmentTests(env, config) {
    console.log(`\n🧪 Testing ${env.toUpperCase()} Environment - PR123 Validation`);
    console.log(`   API: ${config.api}`);
    console.log(`   Frontend: ${config.frontend}\n`);
    
    const results = [];
    
    // Core tests
    results.push(await testEndpoint(`${config.api}/api/stories`, 'API Stories'));
    results.push(await testEndpoint(`${config.frontend}/`, 'Frontend Index'));
    results.push(await testEndpoint(`${config.frontend}/app.js`, 'Frontend App.js'));
    
    // PR123 specific tests
    results.push(await testPR123Functionality(config.frontend));
    
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
    console.log('🚀 PR123 Export Feature - Gating Tests\n');
    
    const results = {};
    
    for (const [env, config] of Object.entries(ENVIRONMENTS)) {
        results[env] = await runEnvironmentTests(env, config);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 PR123 GATING TEST SUMMARY');
    console.log('='.repeat(60));
    
    let allPassed = true;
    for (const [env, result] of Object.entries(results)) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${env.toUpperCase().padEnd(12)}: ${status} (${result.passed}/${result.total})`);
        if (!result.success) allPassed = false;
    }
    
    console.log('='.repeat(60));
    if (allPassed) {
        console.log('🎉 PR123 EXPORT FEATURE: ALL ENVIRONMENTS PASSING');
        console.log('✅ Ready for production deployment');
    } else {
        console.log('⚠️  PR123 EXPORT FEATURE: SOME ENVIRONMENTS FAILING');
        console.log('❌ Requires fixes before production deployment');
    }
    
    process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
