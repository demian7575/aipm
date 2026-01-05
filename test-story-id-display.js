/**
 * Acceptance test for Story ID display in user story details
 * Tests that the story ID is prominently displayed in the details panel
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock story data
const mockStory = {
  id: 1767549495305,
  title: "Show User Story ID on User Story Details",
  description: "Display the unique user story ID in the user story details panel for reference and identification",
  asA: "project manager",
  iWant: "to see the user story ID on the user story details",
  soThat: "I can easily reference and identify specific user stories",
  components: ["WorkModel"],
  storyPoint: 2,
  status: "Draft"
};

async function testStoryIdDisplay() {
  console.log('🧪 Testing Story ID display in user story details...');
  
  // Read the app.js file to verify the implementation
  const appJsPath = path.join(__dirname, 'apps', 'frontend', 'public', 'app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  
  // Check if Story ID row is added to the story brief table
  const hasStoryIdRow = appJsContent.includes('Story ID') && 
                       appJsContent.includes('idRow') &&
                       appJsContent.includes('story.id');
  
  assert(hasStoryIdRow, 'Story ID row should be added to the story brief table');
  
  // Verify the Story ID is displayed with # prefix
  const hasIdPrefix = appJsContent.includes('#${story.id}');
  assert(hasIdPrefix, 'Story ID should be displayed with # prefix');
  
  // Check that the Story ID row is inserted before the Summary row
  const storyIdIndex = appJsContent.indexOf('Story ID');
  const summaryIndex = appJsContent.indexOf('summaryRow');
  const storyIdBeforeSummary = storyIdIndex > 0 && summaryIndex > 0 && storyIdIndex < summaryIndex;
  assert(storyIdBeforeSummary, 'Story ID row should appear before Summary row');
  
  console.log('✅ Story ID display test passed');
  
  return {
    testName: 'Story ID Display Test',
    status: 'PASS',
    details: 'Story ID is properly displayed in user story details panel'
  };
}

// Run the test
testStoryIdDisplay()
  .then(result => {
    console.log(`Test Result: ${result.status}`);
    console.log(`Details: ${result.details}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
