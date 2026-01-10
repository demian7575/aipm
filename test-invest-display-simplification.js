/**
 * Gating Test: Simplify INVEST Display in User Story Details
 * Tests that INVEST display is simplified and redundant text is removed
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  name: 'INVEST Display Simplification',
  description: 'Verify INVEST display is simplified without redundant text',
  timeout: 30000
};

/**
 * Test 1: Verify redundant INVEST text is removed
 */
function testRedundantTextRemoval() {
  console.log('🧪 Testing redundant INVEST text removal...');
  
  const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Check for redundant text patterns that should be removed
  const redundantPatterns = [
    /textContent.*=.*['"]INVEST['"]/, // "INVEST" label
    /textContent.*=.*['"]⚠ Issues['"]/, // "⚠ Issues" text
    /textContent.*=.*['"]Using local INVEST heuristics\.['"]/ // "Using local INVEST heuristics."
  ];
  
  const foundRedundant = [];
  redundantPatterns.forEach((pattern, index) => {
    if (pattern.test(appJsContent)) {
      foundRedundant.push(`Pattern ${index + 1}: ${pattern.source}`);
    }
  });
  
  if (foundRedundant.length > 0) {
    throw new Error(`Found redundant INVEST text that should be removed:\n${foundRedundant.join('\n')}`);
  }
  
  console.log('✅ No redundant INVEST text found');
  return true;
}

/**
 * Test 2: Verify INVEST display is clean and simplified
 */
function testSimplifiedDisplay() {
  console.log('🧪 Testing simplified INVEST display...');
  
  const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Verify health display still exists but is simplified
  const requiredPatterns = [
    /health-pill/, // Health pill styling should remain
    /Pass|Needs review/, // Status text should remain
    /health-issue-list/ // Issue list should remain for functionality
  ];
  
  const missingRequired = [];
  requiredPatterns.forEach((pattern, index) => {
    if (!pattern.test(appJsContent)) {
      missingRequired.push(`Required pattern ${index + 1}: ${pattern.source}`);
    }
  });
  
  if (missingRequired.length > 0) {
    throw new Error(`Missing required INVEST display elements:\n${missingRequired.join('\n')}`);
  }
  
  console.log('✅ Simplified INVEST display elements verified');
  return true;
}

/**
 * Test 3: Verify INVEST feedback remains actionable
 */
function testActionableFeedback() {
  console.log('🧪 Testing actionable INVEST feedback...');
  
  const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Verify actionable elements remain
  const actionablePatterns = [
    /health-issue-button/, // Issue buttons for clicking
    /openHealthIssueModal/, // Modal functionality for details
    /Run AI health check/ // AI check button (updated text)
  ];
  
  const missingActionable = [];
  actionablePatterns.forEach((pattern, index) => {
    if (!pattern.test(appJsContent)) {
      missingActionable.push(`Actionable pattern ${index + 1}: ${pattern.source}`);
    }
  });
  
  if (missingActionable.length > 0) {
    throw new Error(`Missing actionable INVEST feedback elements:\n${missingActionable.join('\n')}`);
  }
  
  console.log('✅ Actionable INVEST feedback elements verified');
  return true;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`🚀 Starting ${TEST_CONFIG.name}`);
  console.log(`📝 ${TEST_CONFIG.description}\n`);
  
  const tests = [
    testRedundantTextRemoval,
    testSimplifiedDisplay,
    testActionableFeedback
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
  
  console.log('🎉 All tests passed!');
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { runTests, TEST_CONFIG };
