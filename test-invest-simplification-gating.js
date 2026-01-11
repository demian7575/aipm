/**
 * Gating test for INVEST display simplification
 * Tests that INVEST criteria display is simplified in user story details
 */

import { execSync } from 'child_process';
import fs from 'fs';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  baseUrl: 'http://localhost:8081'
};

/**
 * Test that INVEST display shows simplified format
 */
async function testInvestDisplaySimplified() {
  console.log('🧪 Testing INVEST display simplification...');
  
  try {
    // Check that frontend contains simplified INVEST display code
    const frontendCode = fs.readFileSync('./apps/frontend/public/app.js', 'utf8');
    
    // Test 1: Check for simplified INVEST class
    if (!frontendCode.includes('invest-simplified')) {
      throw new Error('INVEST simplified class not found in frontend code');
    }
    console.log('✅ INVEST simplified class found');

    // Test 2: Check for simplified health pill display
    if (!frontendCode.includes('health-pill')) {
      throw new Error('Health pill display not found in frontend code');
    }
    console.log('✅ Health pill display found');

    // Test 3: Check for simplified analysis note
    if (!frontendCode.includes('health-analysis-note simplified')) {
      throw new Error('Simplified analysis note not found in frontend code');
    }
    console.log('✅ Simplified analysis note found');

    // Test 4: Check for simplified actions
    if (!frontendCode.includes('health-actions simplified')) {
      throw new Error('Simplified health actions not found in frontend code');
    }
    console.log('✅ Simplified health actions found');

    // Test 5: Check CSS styles for simplified display
    const cssCode = fs.readFileSync('./apps/frontend/public/styles.css', 'utf8');
    if (!cssCode.includes('.invest-simplified')) {
      throw new Error('INVEST simplified CSS styles not found');
    }
    console.log('✅ INVEST simplified CSS styles found');

    console.log('🎉 All INVEST simplification tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ INVEST simplification test failed:', error.message);
    return false;
  }
}

/**
 * Run all gating tests
 */
async function runGatingTests() {
  console.log('🚀 Running INVEST simplification gating tests...\n');
  
  const results = [];
  
  // Run test
  const testResult = await testInvestDisplaySimplified();
  results.push({ name: 'INVEST Display Simplified', passed: testResult });
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log('\n📊 Test Results:');
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All gating tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some gating tests failed');
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runGatingTests().catch(error => {
    console.error('❌ Gating test execution failed:', error);
    process.exit(1);
  });
}

export { runGatingTests, testInvestDisplaySimplified };
