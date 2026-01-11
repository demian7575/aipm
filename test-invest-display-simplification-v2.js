/**
 * Gating Test: INVEST Display Simplification
 * 
 * Tests that the INVEST criteria display in user story details panel
 * shows a simplified format with key information only.
 */

import fs from 'fs';

// Test configuration
const TEST_CONFIG = {
  apiUrl: 'http://localhost:8081',
  frontendUrl: 'http://localhost:8081',
  timeout: 30000
};

/**
 * Test: INVEST display shows simplified format
 * Given: a user story is selected in the details panel
 * When: I view the INVEST criteria section
 * Then: the display should show a clean, simplified format with key information only
 */
async function testInvestDisplaySimplification() {
  console.log('🧪 Testing INVEST display simplification...');
  
  try {
    // Check if frontend code contains simplified INVEST display
    const frontendPath = './apps/frontend/public/app.js';
    if (!fs.existsSync(frontendPath)) {
      throw new Error('Frontend app.js not found');
    }
    
    const frontendCode = fs.readFileSync(frontendPath, 'utf8');
    
    // Verify INVEST display is simplified (not verbose)
    const investDisplayChecks = [
      // Should have simplified health pill display
      { pattern: /✓ Pass.*⚠/, name: 'health pill display' },
      // Should maintain existing INVEST functionality
      { pattern: /investHealth\.satisfied/, name: 'INVEST functionality' }
    ];
    
    let passedChecks = 0;
    for (const check of investDisplayChecks) {
      if (check.pattern.test(frontendCode)) {
        passedChecks++;
        console.log(`✓ ${check.name} check passed`);
      } else {
        console.log(`✗ ${check.name} check failed`);
      }
    }
    
    if (passedChecks < 2) {
      throw new Error(`INVEST display not properly simplified. Passed ${passedChecks}/2 checks`);
    }
    
    console.log('✅ INVEST display simplification test passed');
    return true;
    
  } catch (error) {
    console.error('❌ INVEST display simplification test failed:', error.message);
    return false;
  }
}

// Run the test
testInvestDisplaySimplification()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testInvestDisplaySimplification };
