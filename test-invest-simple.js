/**
 * Gating test for simplified INVEST display
 * Tests that INVEST criteria presentation is clean and actionable
 */

import { execSync } from 'child_process';
import fs from 'fs';

function testInvestDisplaySimplified() {
  console.log('🧪 Testing simplified INVEST display...');
  
  // Read the frontend app.js to verify simplified display implementation
  const appJs = fs.readFileSync('./apps/frontend/public/app.js', 'utf8');
  
  // Test 1: INVEST display should be simplified (no verbose details)
  const hasSimplifiedDisplay = appJs.includes('health-pill') && 
                               appJs.includes('✓ Pass') && 
                               appJs.includes('⚠ Issues');
  
  if (!hasSimplifiedDisplay) {
    throw new Error('INVEST display is not simplified - missing health pill indicators');
  }
  
  // Test 2: Should not have verbose analysis notes in main display
  const hasVerboseElements = appJs.includes('AI-powered analysis') ||
                            appJs.includes('Rule-based analysis') ||
                            appJs.includes('Additional suggestions');
  
  if (hasVerboseElements) {
    throw new Error('INVEST display contains verbose analysis notes that create information overload');
  }
  
  // Test 3: Should not have "Re-check with AI" button in main display
  const hasRecheckButton = appJs.includes('Re-check with AI');
  
  if (hasRecheckButton) {
    throw new Error('INVEST display contains Re-check button that adds complexity');
  }
  
  console.log('✅ INVEST display is simplified and clean');
  return true;
}

// Run the test
try {
  testInvestDisplaySimplified();
  console.log('🎉 All INVEST simplification tests passed!');
  process.exit(0);
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
