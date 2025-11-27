// Test live gating tests by simulating browser execution
const https = require('https');
const http = require('http');

async function fetchAndExecuteGatingTests(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https:') ? https : http;
        
        // First get the gating tests page
        client.get(`${url}/production-gating-tests.html`, (res) => {
            let html = '';
            res.on('data', chunk => html += chunk);
            res.on('end', () => {
                console.log(`📄 Gating tests page status: ${res.statusCode}`);
                
                // Now get the JavaScript file
                client.get(`${url}/production-gating-tests.js`, (jsRes) => {
                    let js = '';
                    jsRes.on('data', chunk => js += chunk);
                    jsRes.on('end', () => {
                        console.log(`📄 Gating tests JS status: ${jsRes.statusCode}`);
                        
                        // Check what tests are actually defined
                        const testSuites = js.match(/PROD_TEST_SUITES\s*=\s*{[\s\S]*?};/);
                        if (testSuites) {
                            console.log('📋 Found test suites in JS');
                            
                            // Check for specific tests
                            const hasExportTest = js.includes('testPR123ExportFunctionality');
                            const hasStagingTest = js.includes('testRunInStagingButton');
                            
                            console.log(`   PR123 Export Test: ${hasExportTest ? '✅' : '❌'}`);
                            console.log(`   Staging Button Test: ${hasStagingTest ? '✅' : '❌'}`);
                        } else {
                            console.log('❌ No test suites found in JS');
                        }
                        
                        resolve({
                            htmlStatus: res.statusCode,
                            jsStatus: jsRes.statusCode,
                            hasTests: testSuites !== null
                        });
                    });
                }).on('error', (err) => {
                    console.log(`❌ JS fetch error: ${err.message}`);
                    resolve({ error: err.message });
                });
            });
        }).on('error', (err) => {
            console.log(`❌ HTML fetch error: ${err.message}`);
            resolve({ error: err.message });
        });
    });
}

async function checkButtonsInHTML(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https:') ? https : http;
        
        client.get(`${url}/index.html`, (res) => {
            let html = '';
            res.on('data', chunk => html += chunk);
            res.on('end', () => {
                const hasExportBtn = html.includes('export-stories-btn');
                const hasStagingBtn = html.includes('run-in-staging-btn');
                
                console.log(`🔍 Button check for ${url}:`);
                console.log(`   Export Stories Button: ${hasExportBtn ? '✅' : '❌'}`);
                console.log(`   Run in Staging Button: ${hasStagingBtn ? '✅' : '❌'}`);
                
                resolve({ hasExportBtn, hasStagingBtn });
            });
        }).on('error', (err) => {
            console.log(`❌ Button check error: ${err.message}`);
            resolve({ error: err.message });
        });
    });
}

async function main() {
    console.log('🔍 Checking ACTUAL deployed state...\n');
    
    const environments = {
        'Production': 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com',
        'Development': 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com'
    };
    
    for (const [name, url] of Object.entries(environments)) {
        console.log(`\n🧪 Testing ${name} Environment:`);
        console.log(`   URL: ${url}`);
        
        // Check buttons in HTML
        await checkButtonsInHTML(url);
        
        // Check gating tests
        await fetchAndExecuteGatingTests(url);
    }
    
    console.log('\n🔍 Deployment verification complete');
}

main().catch(console.error);
