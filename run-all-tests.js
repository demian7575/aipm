// Comprehensive test runner
const https = require('https');
const http = require('http');

const PROD_CONFIG = {
  api: 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod',
  frontend: 'http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com'
};

const DEV_CONFIG = {
  api: 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod',
  frontend: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com'
};

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
    
    client.get(url, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function runTest(name, testFn) {
  try {
    const result = await testFn();
    return { name, success: result.success, message: result.message };
  } catch (error) {
    return { name, success: false, message: error.message };
  }
}

async function testEnvironment(envName, config) {
  console.log(`\n🧪 Testing ${envName} Environment`);
  console.log(`   API: ${config.api}`);
  console.log(`   Frontend: ${config.frontend}\n`);
  
  const tests = [
    {
      name: 'API Stories',
      fn: async () => {
        const res = await fetchUrl(`${config.api}/api/stories`);
        return { success: res.status === 200, message: `Status: ${res.status}` };
      }
    },
    {
      name: 'API Draft',
      fn: async () => {
        const res = await fetchUrl(`${config.api}/api/stories/draft`);
        return { success: res.status === 200, message: `Status: ${res.status}` };
      }
    },
    {
      name: 'Frontend Index',
      fn: async () => {
        const res = await fetchUrl(`${config.frontend}/index.html`);
        return { success: res.status === 200, message: `Status: ${res.status}` };
      }
    },
    {
      name: 'Frontend App.js',
      fn: async () => {
        const res = await fetchUrl(`${config.frontend}/app.js`);
        return { success: res.status === 200, message: `Status: ${res.status}` };
      }
    },
    {
      name: 'Frontend Config',
      fn: async () => {
        const res = await fetchUrl(`${config.frontend}/config.js`);
        return { success: res.status === 200, message: `Status: ${res.status}` };
      }
    },
    {
      name: 'Gating Tests Page',
      fn: async () => {
        const res = await fetchUrl(`${config.frontend}/production-gating-tests.html`);
        return { success: res.status === 200, message: `Status: ${res.status}` };
      }
    },
    {
      name: 'Gating Tests Script',
      fn: async () => {
        const res = await fetchUrl(`${config.frontend}/production-gating-tests.js`);
        return { success: res.status === 200, message: `Status: ${res.status}` };
      }
    }
  ];
  
  const results = [];
  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    results.push(result);
    console.log(`   ${result.success ? '✅' : '❌'} ${result.name}: ${result.message}`);
  }
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n📊 ${envName} Results: ${passed}/${total} tests passed`);
  console.log(passed === total ? `✅ ${envName} environment: ALL TESTS PASSED` : `❌ ${envName} environment: ${total - passed} tests failed`);
  
  return { passed, total, allPassed: passed === total };
}

async function main() {
  console.log('🚀 AIPM Comprehensive Gating Tests\n');
  
  const prodResult = await testEnvironment('PRODUCTION', PROD_CONFIG);
  const devResult = await testEnvironment('DEVELOPMENT', DEV_CONFIG);
  
  console.log('\n' + '='.repeat(70));
  console.log('📋 COMPREHENSIVE GATING TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`PRODUCTION  : ${prodResult.allPassed ? '✅ PASS' : '❌ FAIL'} (${prodResult.passed}/${prodResult.total})`);
  console.log(`DEVELOPMENT : ${devResult.allPassed ? '✅ PASS' : '❌ FAIL'} (${devResult.passed}/${devResult.total})`);
  console.log('='.repeat(70));
  
  if (prodResult.allPassed && devResult.allPassed) {
    console.log('🎉 ALL FUNCTIONALITY TESTS PASSING');
    process.exit(0);
  } else {
    console.log('⚠️  SOME FUNCTIONALITY TESTS FAILING');
    process.exit(1);
  }
}

main();
