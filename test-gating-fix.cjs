#!/usr/bin/env node

// Simple test to verify the gating tests configuration
const https = require('https');

const PROD_CONFIG = {
    api: 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod',
    frontend: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com'
};

async function testEndpoint(url, description) {
    return new Promise((resolve) => {
        const request = https.get(url, (res) => {
            console.log(`✓ ${description}: ${res.statusCode}`);
            resolve({ success: res.statusCode === 200, status: res.statusCode });
        });
        
        request.on('error', (err) => {
            console.log(`✗ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(5000, () => {
            console.log(`✗ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
    });
}

async function testPostEndpoint(url, data, description) {
    return new Promise((resolve) => {
        const postData = JSON.stringify(data);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const request = https.request(url, options, (res) => {
            console.log(`✓ ${description}: ${res.statusCode}`);
            resolve({ success: res.statusCode === 200, status: res.statusCode });
        });
        
        request.on('error', (err) => {
            console.log(`✗ ${description}: Error - ${err.message}`);
            resolve({ success: false, error: err.message });
        });
        
        request.setTimeout(5000, () => {
            console.log(`✗ ${description}: Timeout`);
            request.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        request.write(postData);
        request.end();
    });
}

async function runTests() {
    console.log('🧪 Testing AIPM Gating Test Configuration...\n');
    
    // Test API endpoints
    await testEndpoint(`${PROD_CONFIG.api}/api/stories`, 'API Stories Endpoint');
    await testPostEndpoint(`${PROD_CONFIG.api}/api/stories/draft`, 
        { idea: 'test story', parentId: null }, 
        'API Draft Generation');
    
    // Test frontend assets
    await testEndpoint(`${PROD_CONFIG.frontend}/`, 'Frontend Index');
    await testEndpoint(`${PROD_CONFIG.frontend}/config.js`, 'Frontend Config');
    await testEndpoint(`${PROD_CONFIG.frontend}/production-gating-tests.js`, 'Gating Tests Script');
    await testEndpoint(`${PROD_CONFIG.frontend}/production-gating-tests.html`, 'Gating Tests Page');
    
    console.log('\n✅ Configuration test complete!');
    console.log(`🌐 Visit: ${PROD_CONFIG.frontend}/production-gating-tests.html`);
}

runTests().catch(console.error);
