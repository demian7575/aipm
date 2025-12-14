/**
 * Kiro REST API Integration Test
 * @description Verifies Kiro REST API integration functionality
 */

/**
 * Tests Kiro API health endpoint
 * @returns {Promise<boolean>} Test result
 */
async function testKiroAPIHealth() {
  try {
    const response = await fetch('http://44.220.45.57:8081/health');
    const data = await response.json();
    return response.ok && data.status === 'running';
  } catch (error) {
    console.error('Kiro API health test failed:', error);
    return false;
  }
}

/**
 * Tests Kiro API worker status
 * @returns {Promise<boolean>} Test result
 */
async function testKiroWorkers() {
  try {
    const response = await fetch('http://44.220.45.57:8081/health');
    const data = await response.json();
    return data.workers && data.workers.length > 0;
  } catch (error) {
    console.error('Kiro workers test failed:', error);
    return false;
  }
}

/**
 * Main test function for Kiro REST API integration
 * @returns {Promise<boolean>} Overall test result
 */
async function verifyKiroAPIIntegration() {
  try {
    const healthTest = await testKiroAPIHealth();
    const workersTest = await testKiroWorkers();
    
    const testPassed = healthTest && workersTest;
    
    console.log('Kiro API Health Test:', healthTest ? 'PASS' : 'FAIL');
    console.log('Kiro Workers Test:', workersTest ? 'PASS' : 'FAIL');
    console.log('Overall Test Result:', testPassed ? 'PASS' : 'FAIL');
    
    return testPassed;
  } catch (error) {
    console.error('Kiro API integration test error:', error);
    return false;
  }
}

/**
 * Run the test and update UI
 */
async function runKiroAPITest() {
  const testResult = await verifyKiroAPIIntegration();
  
  if (testResult) {
    console.log('✅ Kiro REST API integration test PASSED');
    return true;
  } else {
    console.log('❌ Kiro REST API integration test FAILED');
    return false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { verifyKiroAPIIntegration, runKiroAPITest };
}

// Auto-run test if in browser environment
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', runKiroAPITest);
}
