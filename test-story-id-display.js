/**
 * Gating test for Story ID display functionality
 * Tests that user story ID is displayed in the details panel
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test that Story ID is displayed in user story details
 */
async function testStoryIdDisplay() {
  console.log('🧪 Testing Story ID display in user story details...');
  
  try {
    // Read the frontend app.js file
    const appJsPath = path.join(__dirname, 'apps', 'frontend', 'public', 'app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    
    // Check if Story ID row is being added to the story brief table
    const hasStoryIdRow = appJsContent.includes('Story ID') && 
                         appJsContent.includes('story.id') &&
                         appJsContent.includes('idRow.appendChild(idHeader)');
    
    if (!hasStoryIdRow) {
      throw new Error('Story ID row not found in renderDetails function');
    }
    
    // Check if the Story ID is formatted with # prefix
    const hasFormattedId = appJsContent.includes('`#${story.id}`') || 
                          appJsContent.includes('"#" + story.id');
    
    if (!hasFormattedId) {
      throw new Error('Story ID not formatted with # prefix');
    }
    
    console.log('✅ Story ID display test passed');
    return true;
    
  } catch (error) {
    console.error('❌ Story ID display test failed:', error.message);
    return false;
  }
}

/**
 * Test that Story ID is prominently displayed
 */
async function testStoryIdProminence() {
  console.log('🧪 Testing Story ID prominence in details panel...');
  
  try {
    const appJsPath = path.join(__dirname, 'apps', 'frontend', 'public', 'app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    
    // Check if Story ID is added to the story brief table (prominent location)
    const isInStoryBrief = appJsContent.includes('storyBriefBody.appendChild(idRow)');
    
    if (!isInStoryBrief) {
      throw new Error('Story ID not prominently displayed in story brief table');
    }
    
    console.log('✅ Story ID prominence test passed');
    return true;
    
  } catch (error) {
    console.error('❌ Story ID prominence test failed:', error.message);
    return false;
  }
}

/**
 * Run all gating tests
 */
async function runGatingTests() {
  console.log('🚀 Running Story ID display gating tests...\n');
  
  const tests = [
    testStoryIdDisplay,
    testStoryIdProminence
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    console.log('');
  }
  
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('❌ Some tests failed. Implementation needs fixes.');
    process.exit(1);
  } else {
    console.log('✅ All gating tests passed!');
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runGatingTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}
