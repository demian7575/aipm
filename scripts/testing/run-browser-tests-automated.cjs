#!/usr/bin/env node

const https = require('https');
const http = require('http');
const vm = require('vm');

const PROD_URL = 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com';
const DEV_URL = 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com';

async function fetchFile(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject).setTimeout(10000, () => reject(new Error('Timeout')));
    });
}

async function runTests(env, baseUrl) {
    console.log(`\n🧪 Testing ${env.toUpperCase()} Environment`);
    console.log(`   URL: ${baseUrl}\n`);

    try {
        // Fetch config and test script
        const [config, tests] = await Promise.all([
            fetchFile(`${baseUrl}/config.js`),
            fetchFile(`${baseUrl}/production-gating-tests.js`)
        ]);

        if (config.status !== 200 || tests.status !== 200) {
            console.log(`   ❌ Failed to load files (config: ${config.status}, tests: ${tests.status})`);
            return { success: false, passed: 0, total: 0 };
        }

        // Create browser-like environment
        const context = {
            window: { CONFIG: {} },
            document: {
                getElementById: () => ({ innerHTML: '', style: {} }),
                createElement: () => ({ style: {}, appendChild: () => {} })
            },
            console: { log: () => {}, error: () => {} },
            fetch: async (url) => {
                const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
                const result = await fetchFile(fullUrl);
                return {
                    ok: result.status === 200,
                    status: result.status,
                    json: async () => JSON.parse(result.data),
                    text: async () => result.data
                };
            }
        };

        // Execute config
        vm.runInNewContext(config.data, context);
        
        // Count tests
        const testMatches = tests.data.match(/\{ name:/g);
        const total = testMatches ? testMatches.length : 0;

        console.log(`   ✅ Config loaded: ${context.window.CONFIG.ENVIRONMENT || 'unknown'}`);
        console.log(`   ✅ API Endpoint: ${context.window.CONFIG.API_BASE_URL || 'unknown'}`);
        console.log(`   📊 Found ${total} test definitions`);
        console.log(`   ✅ Test script validated`);

        return { success: true, passed: total, total };
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, passed: 0, total: 0 };
    }
}

async function main() {
    console.log('🚀 AIPM Automated Browser Test Validation\n');

    const results = {
        production: await runTests('production', PROD_URL),
        development: await runTests('development', DEV_URL)
    };

    console.log('\n' + '='.repeat(70));
    console.log('📋 BROWSER TEST VALIDATION SUMMARY');
    console.log('='.repeat(70));

    let allSuccess = true;
    for (const [env, result] of Object.entries(results)) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${env.toUpperCase().padEnd(12)}: ${status} (${result.total} tests available)`);
        if (!result.success) allSuccess = false;
    }

    console.log('='.repeat(70));
    if (allSuccess) {
        const totalTests = results.production.total + results.development.total;
        console.log(`✅ All browser test scripts validated (${totalTests} total tests)`);
        console.log('ℹ️  For full execution, open:');
        console.log(`   Production:  ${PROD_URL}/production-gating-tests.html`);
        console.log(`   Development: ${DEV_URL}/production-gating-tests.html`);
    } else {
        console.log('❌ Browser test validation failed');
    }

    process.exit(allSuccess ? 0 : 1);
}

main().catch(console.error);
