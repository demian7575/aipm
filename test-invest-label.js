/**
 * Acceptance Test: Details panel displays INVEST label
 * Given: I am viewing a user story in the details panel
 * When: I look at the story information rows
 * Then: I should see INVEST as the row label instead of Summary
 */

import fs from 'fs';
import path from 'path';

function testInvestLabel() {
  const appJsPath = path.join(process.cwd(), 'apps/frontend/public/app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Test that Summary has been changed to INVEST
  const hasInvestLabel = appJsContent.includes("summaryHeader.textContent = 'INVEST';");
  const hasSummaryLabel = appJsContent.includes("summaryHeader.textContent = 'Summary';");
  
  if (hasInvestLabel && !hasSummaryLabel) {
    console.log('✅ PASS: Details panel displays INVEST label instead of Summary');
    return true;
  } else {
    console.log('❌ FAIL: Details panel still shows Summary label or INVEST label not found');
    return false;
  }
}

// Run the test
const testPassed = testInvestLabel();
process.exit(testPassed ? 0 : 1);
