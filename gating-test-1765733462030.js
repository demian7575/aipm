/**
 * Gating Test 1765733462030 - Verify Kiro REST API integration
 */

/**
 * Test Kiro REST API health endpoint
 * @returns {Promise<boolean>} Test result
 */
async function testKiroAPI() {
  try {
    const response = await fetch('http://44.220.45.57:8081/health');
    const data = await response.text();
    return response.ok && data === 'running';
  } catch (error) {
    console.error('Kiro API test failed:', error.message);
    return false;
  }
}

/**
 * Execute gating test
 */
async function runGatingTest() {
  try {
    const result = await testKiroAPI();
    if (result) {
      console.log('✓ Gating Test 1765733462030 PASSED');
      process.exit(0);
    } else {
      console.log('✗ Gating Test 1765733462030 FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error.message);
    process.exit(1);
  }
}

runGatingTest();
