#!/usr/bin/env node

const https = require('https');
const http = require('http');

async function checkGatingTestPage(url, envName) {
    console.log(`\n🔍 Checking ${envName} Gating Tests:`);
    console.log(`   URL: ${url}/production-gating-tests.html`);
    
    return new Promise((resolve) => {
        const client = http;
        const request = client.get(`${url}/production-gating-tests.html`, (res) => {
            let html = '';
            res.on('data', chunk => html += chunk);
            res.on('end', () => {
                console.log(`   📄 HTML Status: ${res.statusCode}`);
                
                // Check if the page has the expected structure
                const hasRunButton = html.includes('id="runAllTests"');
                const hasTestResults = html.includes('id="testResults"');
                const hasConfigScript = html.includes('config.js');
                const hasGatingScript = html.includes('production-gating-tests.js');
                
                console.log(`   🔘 Run Button: ${hasRunButton ? '✅' : '❌'}`);
                console.log(`   🔘 Test Results Container: ${hasTestResults ? '✅' : '❌'}`);
                console.log(`   🔘 Config Script: ${hasConfigScript ? '✅' : '❌'}`);
                console.log(`   🔘 Gating Script: ${hasGatingScript ? '✅' : '❌'}`);
                
                // Now check the config.js
                client.get(`${url}/config.js`, (configRes) => {
                    let config = '';
                    configRes.on('data', chunk => config += chunk);
                    configRes.on('end', () => {
                        console.log(`   ⚙️  Config Status: ${configRes.statusCode}`);
                        
                        const hasApiUrl = config.includes('wk6h5fkqk9.execute-api.us-east-1.amazonaws.com');
                        console.log(`   🔘 API URL in Config: ${hasApiUrl ? '✅' : '❌'}`);
                        
                        if (!hasApiUrl) {
                            console.log(`   📝 Config Content: ${config.substring(0, 200)}...`);
                        }
                        
                        resolve({
                            htmlOk: res.statusCode === 200,
                            configOk: configRes.statusCode === 200,
                            hasRunButton,
                            hasTestResults,
                            hasApiUrl
                        });
                    });
                }).on('error', (err) => {
                    console.log(`   ❌ Config Error: ${err.message}`);
                    resolve({ error: err.message });
                });
            });
        }).on('error', (err) => {
            console.log(`   ❌ HTML Error: ${err.message}`);
            resolve({ error: err.message });
        });
    });
}

async function testActualAPI() {
    console.log('\n🧪 Testing Actual API Endpoints:');
    
    const tests = [
        'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/stories',
        'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/stories/draft'
    ];
    
    for (const url of tests) {
        await new Promise((resolve) => {
            if (url.includes('/draft')) {
                // POST request for draft
                const postData = JSON.stringify({ idea: 'test', parentId: null });
                const urlObj = new URL(url);
                
                const options = {
                    hostname: urlObj.hostname,
                    path: urlObj.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };
                
                const request = https.request(options, (res) => {
                    console.log(`   ${res.statusCode === 200 ? '✅' : '❌'} ${url}: ${res.statusCode}`);
                    resolve();
                });
                
                request.on('error', (err) => {
                    console.log(`   ❌ ${url}: ${err.message}`);
                    resolve();
                });
                
                request.write(postData);
                request.end();
            } else {
                // GET request
                https.get(url, (res) => {
                    console.log(`   ${res.statusCode === 200 ? '✅' : '❌'} ${url}: ${res.statusCode}`);
                    resolve();
                }).on('error', (err) => {
                    console.log(`   ❌ ${url}: ${err.message}`);
                    resolve();
                });
            }
        });
    }
}

async function main() {
    console.log('🔍 REAL GATING TEST DIAGNOSIS\n');
    
    const environments = {
        'Production': 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com',
        'Development': 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com'
    };
    
    // Test API first
    await testActualAPI();
    
    // Check each environment
    for (const [name, url] of Object.entries(environments)) {
        await checkGatingTestPage(url, name);
    }
    
    console.log('\n💡 DIAGNOSIS COMPLETE');
    console.log('\nTo manually test:');
    console.log('1. Open: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/production-gating-tests.html');
    console.log('2. Click "Run Production Tests"');
    console.log('3. Check browser console for errors');
    console.log('4. Compare with: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html');
}

main().catch(console.error);
