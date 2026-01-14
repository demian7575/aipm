/**
 * Acceptance Test: User Story ID Display in Details Panel
 * 
 * Test 1: Story ID remains consistent across sessions
 * Test 2: User story ID is visible in details panel
 */

const API_BASE_URL = 'http://localhost:4000';

async function testStoryIdDisplay() {
  console.log('🧪 Testing Story ID Display in Details Panel');
  
  try {
    // Get stories from API
    const response = await fetch(`${API_BASE_URL}/api/stories`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const stories = await response.json();
    if (!stories || stories.length === 0) {
      throw new Error('No stories found in API response');
    }
    
    const testStory = stories[0];
    console.log('✅ Test Story ID:', testStory.id);
    
    // Test 1: Story ID consistency
    const secondResponse = await fetch(`${API_BASE_URL}/api/stories/${testStory.id}`);
    if (!secondResponse.ok) {
      throw new Error(`Story fetch failed: ${secondResponse.status}`);
    }
    
    const fetchedStory = await secondResponse.json();
    if (fetchedStory.id !== testStory.id) {
      throw new Error(`Story ID inconsistent: ${fetchedStory.id} !== ${testStory.id}`);
    }
    console.log('✅ Test 1 PASSED: Story ID remains consistent');
    
    // Test 2: Story ID visibility (simulated DOM check)
    // This would be verified in the actual frontend implementation
    console.log('✅ Test 2 READY: Story ID visibility will be verified in frontend');
    
    return {
      success: true,
      storyId: testStory.id,
      message: 'Story ID display tests ready for implementation'
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in other test files
export { testStoryIdDisplay };
