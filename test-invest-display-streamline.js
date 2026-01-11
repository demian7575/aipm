/**
 * Gating test for streamlined INVEST criteria display
 * Tests that redundant strings like "INVEST" and "Using local checks" are removed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the frontend app.js file
const appJsPath = path.join(__dirname, 'apps', 'frontend', 'public', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

console.log('🧪 Testing streamlined INVEST criteria display...');

// Test 1: Check that INVEST header labels are removed from display
function testInvestHeaderRemoval() {
  console.log('\n📋 Test 1: INVEST header labels should be removed');
  
  // Look for the specific lines that set INVEST as header text
  const investHeaderMatches = appJsContent.match(/summaryHeader\.textContent\s*=\s*['"]INVEST['"];?/g);
  const healthLabelMatches = appJsContent.match(/healthLabel\.textContent\s*=\s*['"]INVEST['"];?/g);
  
  if (investHeaderMatches || healthLabelMatches) {
    console.log('❌ FAIL: Found redundant INVEST header text');
    if (investHeaderMatches) {
      console.log('   - Found summaryHeader INVEST text:', investHeaderMatches);
    }
    if (healthLabelMatches) {
      console.log('   - Found healthLabel INVEST text:', healthLabelMatches);
    }
    return false;
  }
  
  console.log('✅ PASS: No redundant INVEST header text found');
  return true;
}

// Test 2: Check that "Using local checks" text is removed
function testLocalChecksTextRemoval() {
  console.log('\n📋 Test 2: "Using local checks" text should be removed');
  
  const localChecksMatches = appJsContent.match(/Using local (INVEST )?checks/gi);
  const localHeuristicsMatches = appJsContent.match(/Using local INVEST heuristics/gi);
  
  if (localChecksMatches || localHeuristicsMatches) {
    console.log('❌ FAIL: Found redundant "Using local checks" text');
    if (localChecksMatches) {
      console.log('   - Found local checks text:', localChecksMatches);
    }
    if (localHeuristicsMatches) {
      console.log('   - Found local heuristics text:', localHeuristicsMatches);
    }
    return false;
  }
  
  console.log('✅ PASS: No redundant "Using local checks" text found');
  return true;
}

// Test 3: Verify that INVEST functionality is still present
function testInvestFunctionalityPreserved() {
  console.log('\n📋 Test 3: INVEST functionality should be preserved');
  
  // Check for key INVEST-related functions and variables
  const hasInvestHealth = appJsContent.includes('investHealth');
  const hasInvestIssues = appJsContent.includes('investIssues');
  const hasHealthPill = appJsContent.includes('health-pill');
  const hasInvestValidation = appJsContent.includes('INVEST_WARNINGS');
  
  if (!hasInvestHealth || !hasInvestIssues || !hasHealthPill || !hasInvestValidation) {
    console.log('❌ FAIL: INVEST functionality appears to be missing');
    console.log(`   - investHealth: ${hasInvestHealth}`);
    console.log(`   - investIssues: ${hasInvestIssues}`);
    console.log(`   - health-pill: ${hasHealthPill}`);
    console.log(`   - INVEST_WARNINGS: ${hasInvestValidation}`);
    return false;
  }
  
  console.log('✅ PASS: INVEST functionality is preserved');
  return true;
}

// Run all tests
const test1 = testInvestHeaderRemoval();
const test2 = testLocalChecksTextRemoval();
const test3 = testInvestFunctionalityPreserved();

const allTestsPassed = test1 && test2 && test3;

console.log('\n🎯 GATING TEST RESULTS:');
console.log(`Test 1 (INVEST header removal): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 2 (Local checks text removal): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 3 (INVEST functionality preserved): ${test3 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`\nOverall: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}`);

process.exit(allTestsPassed ? 0 : 1);
