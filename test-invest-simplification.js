/**
 * Gating test for INVEST display simplification
 * Tests that redundant text is removed from INVEST display
 */

import { execSync } from 'child_process';
import fs from 'fs';

function testInvestDisplaySimplification() {
  console.log('Testing INVEST display simplification...');
  
  // Read the frontend app.js file
  const appJsPath = './apps/frontend/public/app.js';
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Test 1: Check that redundant "INVEST" text is removed from header
  const investHeaderMatch = appJsContent.match(/summaryHeader\.textContent\s*=\s*['"`]([^'"`]+)['"`]/);
  if (investHeaderMatch && investHeaderMatch[1] === 'INVEST') {
    throw new Error('FAIL: Redundant "INVEST" text still present in header');
  }
  
  // Test 2: Check that "⚠ Issues" text is not present
  if (appJsContent.includes('⚠ Issues')) {
    throw new Error('FAIL: Redundant "⚠ Issues" text still present');
  }
  
  // Test 3: Check that "Using local INVEST heuristics." text is simplified
  if (appJsContent.includes('Using local INVEST heuristics.')) {
    throw new Error('FAIL: Redundant "Using local INVEST heuristics." text still present');
  }
  
  // Test 4: Check that Health (INVEST) label is simplified
  const healthLabelMatch = appJsContent.match(/healthLabel\.textContent\s*=\s*['"`]([^'"`]+)['"`]/);
  if (healthLabelMatch && healthLabelMatch[1] === 'Health (INVEST)') {
    throw new Error('FAIL: Redundant "Health (INVEST)" label still present');
  }
  
  console.log('✅ All INVEST display simplification tests passed');
  return true;
}

// Run the test
try {
  testInvestDisplaySimplification();
  process.exit(0);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
