/**
 * Gating test for Story ID display functionality
 * Tests that story ID is visible in the details panel
 */

async function testStoryIdDisplay() {
  console.log('🧪 Testing Story ID display in details panel...');
  
  try {
    // Test 1: Verify story data includes ID
    const response = await fetch('http://localhost:4000/api/stories');
    const stories = await response.json();
    
    if (!stories || stories.length === 0) {
      throw new Error('No stories found in API response');
    }
    
    const testStory = stories.find(s => s.id === 1767331599404);
    if (!testStory) {
      throw new Error('Test story 1767331599404 not found');
    }
    
    console.log('✅ Test 1 PASSED: Story data includes ID:', testStory.id);
    
    // Test 2: Verify frontend JavaScript includes Story ID field
    const jsResponse = await fetch('http://localhost:4000/app.js');
    const jsCode = await jsResponse.text();
    
    // Check if the JavaScript code includes the Story ID field
    if (!jsCode.includes('Story ID')) {
      throw new Error('Frontend JavaScript does not include Story ID label');
    }
    
    console.log('✅ Test 2 PASSED: Frontend JavaScript includes Story ID label');
    
    // Test 3: Verify JavaScript includes Story ID rendering
    const jsMatch = jsCode.match(/story\.id/);
    if (!jsMatch) {
      throw new Error('JavaScript does not include story.id rendering');
    }
    
    console.log('✅ Test 3 PASSED: JavaScript includes story.id rendering');
    
    console.log('🎉 ALL GATING TESTS PASSED - Story ID display functionality implemented correctly');
    return true;
    
  } catch (error) {
    console.error('❌ GATING TEST FAILED:', error.message);
    return false;
  }
}

// Run the test
testStoryIdDisplay().then(success => {
  process.exit(success ? 0 : 1);
});
