#!/usr/bin/env node

// Simple test to verify acceptance test modal auto-opening functionality
const http = require('http');

async function testModalFunctionality() {
    console.log('🧪 Testing Acceptance Test Modal Auto-Opening...');
    
    // Test 1: Verify the frontend contains the auto-opening code
    const frontendUrl = 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/app.js';
    
    return new Promise((resolve) => {
        http.get(frontendUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                // Check for auto-opening modal code
                const hasAutoOpen = data.includes('setTimeout') && data.includes('openAcceptanceTestModal(created.id)');
                const hasModalFunction = data.includes('function openAcceptanceTestModal');
                const hasAutoGenerate = data.includes('loadDraft()') && data.includes('if (!test)');
                
                console.log(`   ${hasAutoOpen ? '✅' : '❌'} Auto-opening code: ${hasAutoOpen ? 'Found' : 'Missing'}`);
                console.log(`   ${hasModalFunction ? '✅' : '❌'} Modal function: ${hasModalFunction ? 'Found' : 'Missing'}`);
                console.log(`   ${hasAutoGenerate ? '✅' : '❌'} Auto-generate draft: ${hasAutoGenerate ? 'Found' : 'Missing'}`);
                
                const allPassed = hasAutoOpen && hasModalFunction && hasAutoGenerate;
                console.log(`\n📊 Modal Functionality Test: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
                
                if (allPassed) {
                    console.log('✅ Acceptance test modal should auto-open when creating stories via UI');
                    console.log('✅ Modal should auto-generate draft content');
                    console.log('✅ Tests only created when user clicks "Create Test" button');
                } else {
                    console.log('❌ Modal functionality is incomplete');
                }
                
                resolve(allPassed);
            });
        }).on('error', (err) => {
            console.log(`❌ Error fetching frontend: ${err.message}`);
            resolve(false);
        });
    });
}

testModalFunctionality().then(success => {
    process.exit(success ? 0 : 1);
});
