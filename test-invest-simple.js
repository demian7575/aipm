/**
 * Acceptance tests for simplified INVEST display
 */

import { execSync } from 'child_process';
import fs from 'fs';

function runTest(testName, testFn) {
  try {
    console.log(`Running: ${testName}`);
    testFn();
    console.log(`✅ PASS: ${testName}`);
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${testName} - ${error.message}`);
    return false;
  }
}

function testInvestDisplaySimplified() {
  const appJs = fs.readFileSync('./apps/frontend/public/app.js', 'utf8');
  
  // Test 1: INVEST display should be clean and easy to understand
  if (!appJs.includes('health-pill')) {
    throw new Error('Health pill styling not found for clean display');
  }
  
  if (!appJs.includes('Pass') || !appJs.includes('Needs review')) {
    throw new Error('Simple pass/fail indicators not found');
  }
}

function testInvestFeedbackActionable() {
  const appJs = fs.readFileSync('./apps/frontend/public/app.js', 'utf8');
  
  // Test 2: INVEST feedback should be actionable
  if (!appJs.includes('health-issue-button')) {
    throw new Error('Clickable issue buttons not found for actionable feedback');
  }
  
  if (!appJs.includes('openHealthIssueModal')) {
    throw new Error('Modal for detailed issue explanation not found');
  }
}

// Run acceptance tests
const tests = [
  ['INVEST display is simplified', testInvestDisplaySimplified],
  ['INVEST feedback is actionable', testInvestFeedbackActionable]
];

let passed = 0;
let total = tests.length;

tests.forEach(([name, testFn]) => {
  if (runTest(name, testFn)) {
    passed++;
  }
});

console.log(`\nTest Results: ${passed}/${total} passed`);

if (passed === total) {
  console.log('✅ All acceptance tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}
