#!/usr/bin/env node

const https = require('https');
const http = require('http');

const DEV_URL = 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com';
const API_URL = 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod';
const MAX_ITERATIONS = 10;

async function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => req.destroy(new Error('Timeout')));
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function runGatingTest(testName, testFn) {
    try {
        await testFn();
        console.log(`✅ ${testName}`);
        return true;
    } catch (error) {
        console.log(`❌ ${testName}: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    const tests = [
        ['Frontend Access', async () => {
            const res = await makeRequest(`${DEV_URL}/index.html`);
            if (res.status !== 200) throw new Error(`Status ${res.status}`);
        }],
        
        ['API Health', async () => {
            const res = await makeRequest(`${API_URL}/`);
            if (res.status !== 200) throw new Error(`Status ${res.status}`);
            const data = JSON.parse(res.data);
            if (data.status !== 'ok') throw new Error('API not healthy');
        }],
        
        ['Stories API', async () => {
            const res = await makeRequest(`${API_URL}/api/stories`);
            if (res.status !== 200) throw new Error(`Status ${res.status}`);
        }],
        
        ['CORS Headers', async () => {
            const res = await makeRequest(`${API_URL}/`, {
                method: 'OPTIONS',
                headers: { 'Origin': DEV_URL }
            });
            if (res.status !== 200) throw new Error(`Status ${res.status}`);
        }],
        
        ['Config Loading', async () => {
            const res = await makeRequest(`${DEV_URL}/config.js`);
            if (res.status !== 200 || !res.data.includes('API_BASE_URL')) {
                throw new Error('Config not found');
            }
        }]
    ];

    let passed = 0;
    for (const [name, testFn] of tests) {
        if (await runGatingTest(name, testFn)) passed++;
    }
    
    return { passed, total: tests.length };
}

async function main() {
    console.log('🧪 Running Development Environment Gating Tests\n');
    
    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
        console.log(`📋 Iteration ${iteration}/${MAX_ITERATIONS}`);
        
        const result = await runAllTests();
        console.log(`\n📊 Results: ${result.passed}/${result.total} passed\n`);
        
        if (result.passed === result.total) {
            console.log('🎉 All tests passed!');
            process.exit(0);
        }
        
        if (iteration < MAX_ITERATIONS) {
            console.log('⏳ Waiting 3 seconds before retry...\n');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log('❌ Tests failed after maximum iterations');
    process.exit(1);
}

main().catch(console.error);
