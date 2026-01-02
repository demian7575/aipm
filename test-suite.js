/**
 * Test suite for code generation functionality
 */
import { simpleTest, runTest } from './simple-test-final.js';
import { pr19Implementation } from './pr-19-implementation.js';

/**
 * Run all tests for the code generation feature
 */
function runAllTests() {
  console.log('🧪 Running Code Generation Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const results = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passedTests: 0,
    results: []
  };
  
  // Run simple test
  const simpleTestResult = runTest();
  results.results.push(simpleTestResult);
  results.totalTests++;
  if (simpleTestResult.status === 'success') results.passedTests++;
  
  // Run PR #19 implementation test
  try {
    const pr19Result = pr19Implementation();
    results.results.push({
      status: 'success',
      result: pr19Result,
      timestamp: new Date().toISOString(),
      testName: 'PR #19 Implementation'
    });
    results.totalTests++;
    results.passedTests++;
  } catch (error) {
    results.results.push({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      testName: 'PR #19 Implementation'
    });
    results.totalTests++;
  }
  
  console.log(`📊 Results: ${results.passedTests}/${results.totalTests} tests passed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return results;
}

export { runAllTests };
