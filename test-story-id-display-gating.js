// Test: Display Story ID in Interface
// Acceptance Test 1: Story ID visible in detail view
// Acceptance Test 2: Story ID visible in story list

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  testName: 'Display Story ID in Interface',
  storyId: '1767466930923',
  expectedElements: [
    'story ID in detail panel',
    'story ID in outline list'
  ]
};

function runGatingTests() {
  console.log(`🧪 Running gating tests for: ${TEST_CONFIG.testName}`);
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Story ID visible in detail view
  console.log('\n📋 Test 1: Story ID visible in detail view');
  try {
    const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    
    // Check if story ID is displayed prominently in detail panel title area
    const hasStoryIdLabel = appJsContent.includes('Story ID') || appJsContent.includes('ID:');
    const hasStoryIdDisplay = appJsContent.includes('${story.id}') && 
                             appJsContent.includes('Title');
    
    if (hasStoryIdLabel && hasStoryIdDisplay) {
      console.log('✅ PASS: Story ID prominently displayed in detail view');
      passed++;
    } else {
      console.log('❌ FAIL: Story ID not prominently displayed in detail view');
      console.log(`  - Has ID label: ${hasStoryIdLabel}`);
      console.log(`  - Has ID display: ${hasStoryIdDisplay}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking detail view:', error.message);
    failed++;
  }
  
  // Test 2: Story ID visible in story list
  console.log('\n📋 Test 2: Story ID visible in story list');
  try {
    const appJsPath = path.join(__dirname, 'apps/frontend/public/app.js');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    
    // Check if story ID is displayed in outline/list with # prefix
    const hasStoryIdInTitle = appJsContent.includes('#${story.id}') && 
                             appJsContent.includes('title.textContent');
    
    if (hasStoryIdInTitle) {
      console.log('✅ PASS: Story ID with # prefix displayed in story list');
      passed++;
    } else {
      console.log('❌ FAIL: Story ID with # prefix not displayed in story list');
      failed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking story list:', error.message);
    failed++;
  }
  
  // Summary
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All gating tests PASSED!');
    return true;
  } else {
    console.log('💥 Some gating tests FAILED!');
    return false;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runGatingTests();
  process.exit(success ? 0 : 1);
}

export { runGatingTests };
