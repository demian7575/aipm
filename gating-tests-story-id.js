/**
 * Gating Tests for Story ID Display Feature
 */

function runGatingTests() {
  console.log('🧪 Running gating tests for Story ID Display...');
  
  // Test 1: Story ID element exists in details panel
  const detailsContent = document.querySelector('.details-content');
  if (!detailsContent) {
    console.error('❌ Details panel not found');
    return false;
  }
  
  // Mock story data for testing
  const mockStory = { id: 1767659765187, title: 'Test Story' };
  
  // Simulate story selection and details rendering
  window.state = window.state || { selectedStoryId: mockStory.id };
  window.storyIndex = window.storyIndex || new Map();
  window.storyIndex.set(mockStory.id, mockStory);
  
  // Check if story ID is displayed
  const storyIdElements = document.querySelectorAll('.story-id');
  if (storyIdElements.length === 0) {
    console.error('❌ Story ID element not found');
    return false;
  }
  
  console.log('✅ All gating tests passed');
  return true;
}

// Auto-run tests
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(runGatingTests, 1000);
  });
}
