/**
 * Gating test for INVEST row clean display
 * Tests that redundant strings are removed from INVEST row content
 */

import { execSync } from 'child_process';
import fs from 'fs';

// Test configuration
const TEST_CONFIG = {
  apiUrl: 'http://localhost:8081',
  timeout: 30000
};

/**
 * Test that INVEST row displays clean content without redundant strings
 */
async function testInvestCleanDisplay() {
  console.log('🧪 Testing INVEST row clean display...');
  
  try {
    // Start the server
    console.log('Starting server...');
    const serverProcess = execSync('npm run dev > /dev/null 2>&1 &', { stdio: 'ignore' });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Read the frontend app.js file
    const appJsContent = fs.readFileSync('./apps/frontend/public/app.js', 'utf8');
    
    // Test 1: Check that "INVEST" label is removed from table header
    const hasInvestTableHeader = appJsContent.includes("summaryHeader.textContent = 'INVEST'");
    if (hasInvestTableHeader) {
      throw new Error('❌ INVEST table header label should be removed');
    }
    console.log('✅ INVEST table header label removed');
    
    // Test 2: Check that "INVEST" label is removed from meta grid
    const hasInvestMetaLabel = appJsContent.includes("healthLabel.textContent = 'INVEST'");
    if (hasInvestMetaLabel) {
      throw new Error('❌ INVEST meta grid label should be removed');
    }
    console.log('✅ INVEST meta grid label removed');
    
    // Test 3: Check that "Using local checks" text is removed
    const hasUsingLocalChecks = appJsContent.includes("'Using local checks'");
    if (hasUsingLocalChecks) {
      throw new Error('❌ "Using local checks" text should be removed');
    }
    console.log('✅ "Using local checks" text removed');
    
    // Test 4: Check that "AI unavailable - using local checks" is simplified
    const hasLongFallbackText = appJsContent.includes("'AI unavailable - using local checks'");
    if (hasLongFallbackText) {
      throw new Error('❌ Long fallback text should be simplified');
    }
    console.log('✅ Long fallback text simplified');
    
    // Test 5: Check that "Using local INVEST heuristics" is simplified
    const hasLongHeuristicText = appJsContent.includes("'Using local INVEST heuristics for guidance.'");
    if (hasLongHeuristicText) {
      throw new Error('❌ Long heuristic text should be simplified');
    }
    console.log('✅ Long heuristic text simplified');
    
    console.log('✅ All INVEST clean display tests passed');
    return true;
    
  } catch (error) {
    console.error('❌ INVEST clean display test failed:', error.message);
    return false;
  }
}

// Run the test
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testInvestCleanDisplay()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { testInvestCleanDisplay };
