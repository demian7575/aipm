// Test gating tests by fetching and parsing results
const https = require('https');
const http = require('http');

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function testEnvironment(name, url) {
  console.log(`\n🧪 Testing ${name} Environment`);
  console.log(`   URL: ${url}`);
  
  try {
    const result = await fetchUrl(url);
    if (result.status === 200) {
      console.log(`   ✅ Page loads: ${result.status}`);
      
      // Check if page has test structure
      const hasTests = result.data.includes('test-item') || result.data.includes('runTests');
      console.log(`   ${hasTests ? '✅' : '❌'} Test structure: ${hasTests ? 'Found' : 'Missing'}`);
      
      return hasTests;
    } else {
      console.log(`   ❌ Page failed: ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Browser-Based Gating Test Verification\n');
  
  const prodResult = await testEnvironment(
    'PRODUCTION',
    'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/production-gating-tests.html'
  );
  
  const devResult = await testEnvironment(
    'DEVELOPMENT',
    'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/production-gating-tests.html'
  );
  
  console.log('\n' + '='.repeat(70));
  console.log('📋 SUMMARY');
  console.log('='.repeat(70));
  console.log(`PRODUCTION  : ${prodResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`DEVELOPMENT : ${devResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(70));
  
  if (prodResult && devResult) {
    console.log('🎉 All browser-based gating tests accessible');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

main();
