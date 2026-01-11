/**
 * Gating Test: INVEST Display Simplification v2
 * Tests that INVEST criteria display shows simplified format in user story details
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  testStoryId: 'test-invest-display-1768096681748',
  testStoryTitle: 'Test Story for INVEST Display v2',
  testStoryDescription: 'A test story to verify INVEST display simplification v2',
  expectedSimplifiedFormat: true
};

/**
 * Test that INVEST display shows simplified format
 */
function testInvestDisplaySimplification() {
  console.log('🧪 Testing INVEST display simplification...');
  
  // Read the frontend app.js file
  const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
  if (!fs.existsSync(appJsPath)) {
    throw new Error('Frontend app.js file not found');
  }
  
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Check for simplified INVEST display implementation
  const hasSimplifiedDisplay = appJsContent.includes('health-pill') && 
                               appJsContent.includes('✓ Pass') &&
                               appJsContent.includes('⚠');
  
  if (!hasSimplifiedDisplay) {
    throw new Error('INVEST display does not show simplified format with health pills');
  }
  
  // Verify the display shows key information only (not verbose details)
  const hasVerboseDisplay = appJsContent.includes('detailed-invest-analysis') ||
                           appJsContent.includes('full-invest-breakdown');
  
  if (hasVerboseDisplay) {
    throw new Error('INVEST display still contains verbose/detailed format elements');
  }
  
  console.log('✅ INVEST display shows simplified format');
  return true;
}

/**
 * Test that INVEST health pill shows correct status
 */
function testInvestHealthPill() {
  console.log('🧪 Testing INVEST health pill display...');
  
  const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Check for health pill implementation
  const healthPillRegex = /health-pill.*\$\{investHealth\.satisfied.*\?.*'pass'.*:.*'fail'\}/;
  if (!healthPillRegex.test(appJsContent)) {
    throw new Error('Health pill does not properly reflect INVEST satisfaction status');
  }
  
  // Check for simplified text content
  const simplifiedTextRegex = /investHealth\.satisfied.*\?.*'✓ Pass'.*:.*`⚠.*issue/;
  if (!simplifiedTextRegex.test(appJsContent)) {
    throw new Error('Health pill does not show simplified pass/fail text');
  }
  
  console.log('✅ INVEST health pill displays correct simplified status');
  return true;
}

/**
 * Test that INVEST section maintains clean layout
 */
function testInvestCleanLayout() {
  console.log('🧪 Testing INVEST section clean layout...');
  
  const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Check for story-meta-grid structure
  if (!appJsContent.includes('story-meta-grid')) {
    throw new Error('INVEST section does not use clean grid layout');
  }
  
  // Check for story-meta-item structure
  if (!appJsContent.includes('story-meta-item')) {
    throw new Error('INVEST section does not use clean item structure');
  }
  
  // Verify INVEST label is present
  if (!appJsContent.includes("textContent = 'INVEST'")) {
    throw new Error('INVEST label is missing from the display');
  }
  
  console.log('✅ INVEST section maintains clean layout structure');
  return true;
}

/**
 * Run all INVEST display simplification tests
 */
function runAllTests() {
  console.log('🚀 Running INVEST Display Simplification Gating Tests v2...\n');
  
  const tests = [
    testInvestDisplaySimplification,
    testInvestHealthPill,
    testInvestCleanLayout
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.error('❌ INVEST Display Simplification tests failed');
    process.exit(1);
  }
  
  console.log('✅ All INVEST Display Simplification tests passed');
  return true;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export {
  runAllTests,
  testInvestDisplaySimplification,
  testInvestHealthPill,
  testInvestCleanLayout
};
