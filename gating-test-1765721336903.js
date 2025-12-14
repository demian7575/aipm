/**
 * Gating Test 1765721336903 - Kiro REST API Integration Verification
 * @description Verifies Kiro REST API integration functionality
 */

/**
 * Tests Kiro API health endpoint
 * @returns {Promise<Object>} Test result with status
 */
async function testKiroAPIHealth() {
  try {
    const response = await fetch('http://44.220.45.57:8081/health');
    const data = await response.json();
    
    return {
      success: response.ok && data.status === 'running',
      status: data.status,
      workers: data.workers?.length || 0,
      uptime: data.uptime
    };
  } catch (error) {
    console.error('Kiro API health test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifies Kiro REST API integration
 * @returns {Promise<boolean>} True if test passes
 */
async function verifyKiroAPIIntegration() {
  try {
    const healthResult = await testKiroAPIHealth();
    
    if (healthResult.success) {
      console.log('✅ Kiro API Health: PASS');
      console.log(`   Status: ${healthResult.status}`);
      console.log(`   Workers: ${healthResult.workers}`);
      console.log(`   Uptime: ${Math.floor(healthResult.uptime / 3600)}h`);
      return true;
    } else {
      console.log('❌ Kiro API Health: FAIL');
      console.log(`   Error: ${healthResult.error}`);
      return false;
    }
  } catch (error) {
    console.error('Kiro API integration test error:', error);
    return false;
  }
}

/**
 * Run gating test
 * @returns {Promise<boolean>} Test result
 */
async function runGatingTest() {
  console.log('Running Gating Test 1765721336903...');
  const testPassed = await verifyKiroAPIIntegration();
  console.log(`Gating Test Result: ${testPassed ? 'PASS' : 'FAIL'}`);
  return testPassed;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { verifyKiroAPIIntegration, runGatingTest };
}

// Auto-run test if in browser environment
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', runGatingTest);
}
