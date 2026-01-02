/**
 * Test runner for simple test functions
 * Integrates all test functionality for the AIPM project
 */

// Import test functions
import { simpleTest, runSimpleTests } from './simple-test.js';
import { testCodeGeneration } from './test-code-gen-477.js';

/**
 * Main test runner function
 */
function runAllTests() {
  console.log('🧪 Running All Simple Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const results = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    results: []
  };
  
  // Run simple tests
  try {
    const simpleResult = runSimpleTests();
    results.results.push({
      testName: 'Simple Test Suite',
      status: simpleResult.status,
      details: simpleResult
    });
    results.totalTests++;
    if (simpleResult.status === 'passed') results.passedTests++;
    else results.failedTests++;
  } catch (error) {
    results.results.push({
      testName: 'Simple Test Suite',
      status: 'failed',
      error: error.message
    });
    results.totalTests++;
    results.failedTests++;
  }
  
  // Run code generation tests
  try {
    const codeGenResult = testCodeGeneration();
    results.results.push({
      testName: 'Code Generation Test',
      status: codeGenResult.status,
      details: codeGenResult
    });
    results.totalTests++;
    if (codeGenResult.status === 'success') results.passedTests++;
    else results.failedTests++;
  } catch (error) {
    results.results.push({
      testName: 'Code Generation Test',
      status: 'failed',
      error: error.message
    });
    results.totalTests++;
    results.failedTests++;
  }
  
  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Test Results: ${results.passedTests}/${results.totalTests} passed`);
  
  if (results.failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED');
  } else {
    console.log(`❌ ${results.failedTests} tests failed`);
  }
  
  return results;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };
