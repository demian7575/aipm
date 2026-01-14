/**
 * Gating tests for simplified INVEST display in user story details
 * These tests validate the acceptance criteria for story 1767886045625
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:4000'
};

/**
 * Test 1: INVEST display is simplified
 * Given: I am viewing a user story details panel
 * When: I look at the INVEST criteria section
 * Then: the display should be clean and easy to understand
 */
async function testInvestDisplaySimplified() {
  console.log('🧪 Testing: INVEST display is simplified');
  
  // Read the frontend app.js file to verify simplified display implementation
  const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Check for simplified INVEST display patterns
  const hasSimplifiedHealthPill = appJsContent.includes('health-pill');
  const hasCleanPassFailDisplay = appJsContent.includes('✓ Pass') && appJsContent.includes('⚠');
  const hasMinimalIssueCount = appJsContent.includes('issue${investHealth.issues.length > 1 ? \'s\' : \'\'}');
  
  if (!hasSimplifiedHealthPill) {
    throw new Error('INVEST display should use simplified health-pill styling');
  }
  
  if (!hasCleanPassFailDisplay) {
    throw new Error('INVEST display should show clean pass/fail indicators');
  }
  
  if (!hasMinimalIssueCount) {
    throw new Error('INVEST display should show minimal issue count format');
  }
  
  console.log('✅ INVEST display is properly simplified');
  return true;
}

/**
 * Test 2: INVEST feedback is actionable
 * Given: I have INVEST validation warnings
 * When: I review the simplified display
 * Then: I should clearly understand what needs to be fixed
 */
async function testInvestFeedbackActionable() {
  console.log('🧪 Testing: INVEST feedback is actionable');
  
  const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Check for actionable feedback patterns
  const hasIssueButtons = appJsContent.includes('health-issue-button');
  const hasModalSupport = appJsContent.includes('openHealthIssueModal');
  const hasAiAnalysisNote = appJsContent.includes('health-analysis-note');
  const hasActionableButtons = appJsContent.includes('Run AI check');
  
  if (!hasIssueButtons) {
    throw new Error('INVEST feedback should provide clickable issue buttons');
  }
  
  if (!hasModalSupport) {
    throw new Error('INVEST feedback should support detailed issue modals');
  }
  
  if (!hasAiAnalysisNote) {
    throw new Error('INVEST feedback should include analysis context notes');
  }
  
  if (!hasActionableButtons) {
    throw new Error('INVEST feedback should provide actionable buttons like "Run AI check"');
  }
  
  console.log('✅ INVEST feedback is actionable and clear');
  return true;
}

/**
 * Test 3: Verify no information overload
 * Ensure the simplified display reduces cognitive load
 */
async function testNoInformationOverload() {
  console.log('🧪 Testing: No information overload in INVEST display');
  
  const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Check that complex details are hidden behind interactions
  const hasCollapsedDetails = appJsContent.includes('Additional suggestions');
  const hasConditionalDisplay = appJsContent.includes('analysisInfo && analysisInfo.source');
  const hasMinimalInitialDisplay = appJsContent.includes('health-pill');
  
  if (!hasCollapsedDetails) {
    throw new Error('Complex INVEST details should be collapsed by default');
  }
  
  if (!hasConditionalDisplay) {
    throw new Error('INVEST display should conditionally show analysis info');
  }
  
  if (!hasMinimalInitialDisplay) {
    throw new Error('Initial INVEST display should be minimal');
  }
  
  console.log('✅ INVEST display avoids information overload');
  return true;
}

/**
 * Run all gating tests
 */
async function runGatingTests() {
  console.log('🚀 Running INVEST Display Simplification Gating Tests');
  console.log('=' .repeat(60));
  
  const tests = [
    testInvestDisplaySimplified,
    testInvestFeedbackActionable,
    testNoInformationOverload
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }
  
  console.log('=' .repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
  
  console.log('🎉 All gating tests passed!');
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runGatingTests().catch(error => {
    console.error('💥 Gating tests failed:', error);
    process.exit(1);
  });
}

export {
  testInvestDisplaySimplified,
  testInvestFeedbackActionable,
  testNoInformationOverload,
  runGatingTests
};
