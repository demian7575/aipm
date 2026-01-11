/**
 * Gating Test: INVEST Display Simplification
 * 
 * Tests that the INVEST criteria display in user story details panel
 * shows a simplified format with key information only.
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
 * Test: INVEST display shows simplified format
 * Given: a user story is selected in the details panel
 * When: I view the INVEST criteria section
 * Then: the display should show a clean, simplified format with key information only
 */
async function testInvestDisplaySimplification() {
  console.log('🧪 Testing INVEST display simplification...');
  
  try {
    // Start the server if not running
    console.log('Starting AIPM server...');
    const serverProcess = execSync('npm run dev &', { 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Read the frontend app.js to verify INVEST display implementation
    const appJsPath = path.join(process.cwd(), 'apps/frontend/public/app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    
    // Test 1: Verify INVEST display uses simplified format
    console.log('✓ Checking INVEST display implementation...');
    
    // Check for simplified INVEST health display
    const hasSimplifiedHealthPill = appJsContent.includes('health-pill') && 
                                   appJsContent.includes('✓ Pass') &&
                                   appJsContent.includes('⚠');
    
    if (!hasSimplifiedHealthPill) {
      throw new Error('INVEST display does not use simplified health pill format');
    }
    
    // Test 2: Verify clean display without information overload
    console.log('✓ Checking for clean display format...');
    
    // Check that INVEST section shows concise information
    const hasCleanFormat = appJsContent.includes('story-meta-grid') &&
                          appJsContent.includes('story-meta-item') &&
                          appJsContent.includes('story-meta-label');
    
    if (!hasCleanFormat) {
      throw new Error('INVEST display does not use clean meta grid format');
    }
    
    // Test 3: Verify key information is preserved
    console.log('✓ Checking key information preservation...');
    
    // Check that essential INVEST information is still available
    const hasKeyInfo = appJsContent.includes('investHealth.satisfied') &&
                      appJsContent.includes('investHealth.issues') &&
                      appJsContent.includes('INVEST');
    
    if (!hasKeyInfo) {
      throw new Error('Key INVEST information is not preserved in simplified display');
    }
    
    // Test 4: Verify AI analysis integration remains functional
    console.log('✓ Checking AI analysis integration...');
    
    const hasAiIntegration = appJsContent.includes('analysisInfo') &&
                            appJsContent.includes('aiSummary') &&
                            (appJsContent.includes('AI check') || appJsContent.includes('Re-check'));
    
    if (!hasAiIntegration) {
      throw new Error('AI analysis integration is not properly maintained');
    }
    
    console.log('✅ All INVEST display simplification tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ INVEST display simplification test failed:', error.message);
    throw error;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testInvestDisplaySimplification()
    .then(() => {
      console.log('🎉 INVEST display simplification gating test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 INVEST display simplification gating test failed:', error);
      process.exit(1);
    });
}

export { testInvestDisplaySimplification };
