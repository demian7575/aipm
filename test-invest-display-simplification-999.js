/**
 * Gating Test: INVEST Display Simplification (PR #999)
 * Tests that INVEST display is simplified by removing redundant text
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  testName: 'INVEST Display Simplification',
  prNumber: 999,
  timeout: 30000
};

/**
 * Test that INVEST display removes redundant text elements
 */
function testInvestDisplaySimplification() {
  console.log(`\n=== ${TEST_CONFIG.testName} Gating Test ===`);
  
  try {
    // Read the frontend app.js file
    const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    
    // Test 1: Check that redundant "INVEST" text is removed
    const investTextPattern = /textContent\s*=\s*['"]INVEST['"]/;
    if (investTextPattern.test(appJsContent)) {
      throw new Error('FAIL: Found redundant "INVEST" text in display');
    }
    console.log('✓ PASS: Redundant "INVEST" text removed');
    
    // Test 2: Check that "⚠ Issues" text is removed
    const issuesTextPattern = /textContent\s*=\s*['"]⚠ Issues['"]/;
    if (issuesTextPattern.test(appJsContent)) {
      throw new Error('FAIL: Found redundant "⚠ Issues" text in display');
    }
    console.log('✓ PASS: Redundant "⚠ Issues" text removed');
    
    // Test 3: Check that "Using local INVEST heuristics" text is simplified
    const heuristicsTextPattern = /Using local INVEST heuristics/;
    if (heuristicsTextPattern.test(appJsContent)) {
      throw new Error('FAIL: Found verbose "Using local INVEST heuristics" text');
    }
    console.log('✓ PASS: Verbose heuristics text simplified');
    
    // Test 4: Verify Health label is used instead of INVEST
    const healthLabelPattern = /textContent\s*=\s*['"]Health['"]/;
    if (!healthLabelPattern.test(appJsContent)) {
      throw new Error('FAIL: Health label not found in INVEST display');
    }
    console.log('✓ PASS: Health label used instead of INVEST');
    
    console.log(`\n✅ All ${TEST_CONFIG.testName} tests passed!`);
    return true;
    
  } catch (error) {
    console.error(`\n❌ ${TEST_CONFIG.testName} test failed:`, error.message);
    return false;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = testInvestDisplaySimplification();
  process.exit(success ? 0 : 1);
}

export { testInvestDisplaySimplification };
