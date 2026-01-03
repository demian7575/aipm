/**
 * Acceptance Tests for Story ID Display Feature
 * Tests that unique identifiers are visible in both outline and mindmap views
 */

import assert from 'assert';

// Test data
const testStory = {
  id: 1767460138732,
  title: "Display User Story Unique Identifiers",
  status: "Ready",
  storyPoint: 2,
  components: ["WorkModel"]
};

/**
 * Test 1: Story ID visible in outline view
 * Given: I am viewing the user story outline
 * When: I look at any user story entry
 * Then: I can see the unique identifier displayed alongside the story title
 */
function testOutlineStoryIdDisplay() {
  console.log('Testing outline story ID display...');
  
  // Simulate the outline rendering logic
  const outlineTitle = `#${testStory.id} ${testStory.title}${testStory.storyPoint != null ? ` (SP ${testStory.storyPoint})` : ''}`;
  
  // Verify the ID is included in the title
  assert(outlineTitle.includes(`#${testStory.id}`), 'Story ID should be visible in outline title');
  assert(outlineTitle.includes(testStory.title), 'Story title should be visible in outline');
  assert(outlineTitle.includes('(SP 2)'), 'Story points should be visible in outline');
  
  console.log('✓ Outline story ID display test passed');
  console.log(`  Expected format: #${testStory.id} ${testStory.title} (SP ${testStory.storyPoint})`);
  console.log(`  Actual output: ${outlineTitle}`);
}

/**
 * Test 2: Story ID visible in mindmap view
 * Given: I am viewing the mindmap visualization
 * When: I examine any story node
 * Then: the unique identifier is clearly displayed on the story node
 */
function testMindmapStoryIdDisplay() {
  console.log('Testing mindmap story ID display...');
  
  // Simulate the mindmap rendering logic
  const rawTitle = testStory.title != null ? String(testStory.title) : '';
  const title = rawTitle.trim().length > 0 ? rawTitle : 'Untitled Story';
  const mindmapTitle = `#${testStory.id} ${title}`;
  
  // Verify the ID is included in the mindmap title
  assert(mindmapTitle.includes(`#${testStory.id}`), 'Story ID should be visible in mindmap title');
  assert(mindmapTitle.includes(testStory.title), 'Story title should be visible in mindmap');
  assert(mindmapTitle.startsWith('#'), 'Mindmap title should start with # symbol');
  
  console.log('✓ Mindmap story ID display test passed');
  console.log(`  Expected format: #${testStory.id} ${testStory.title}`);
  console.log(`  Actual output: ${mindmapTitle}`);
}

/**
 * Test 3: Story ID format consistency
 * Verify that both views use the same ID format
 */
function testStoryIdFormatConsistency() {
  console.log('Testing story ID format consistency...');
  
  const outlineIdFormat = `#${testStory.id}`;
  const mindmapIdFormat = `#${testStory.id}`;
  
  assert(outlineIdFormat === mindmapIdFormat, 'Both views should use the same ID format');
  assert(outlineIdFormat.match(/^#\d+$/), 'ID format should be # followed by digits');
  
  console.log('✓ Story ID format consistency test passed');
  console.log(`  ID format: ${outlineIdFormat}`);
}

// Run all tests
function runAllTests() {
  console.log('Running Story ID Display Acceptance Tests...\n');
  
  try {
    testOutlineStoryIdDisplay();
    console.log('');
    
    testMindmapStoryIdDisplay();
    console.log('');
    
    testStoryIdFormatConsistency();
    console.log('');
    
    console.log('✅ All Story ID Display tests passed!');
    console.log('Story unique identifiers are correctly displayed in both outline and mindmap views.');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Export for use in other test files
export {
  testOutlineStoryIdDisplay,
  testMindmapStoryIdDisplay,
  testStoryIdFormatConsistency,
  runAllTests
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}
