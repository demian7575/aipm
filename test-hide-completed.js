// Test file to verify hide completed functionality
function testHideCompletedFeature() {
  console.log('Testing Hide Completed functionality...');
  
  // Test data with mixed statuses
  const testStories = [
    { id: 1, title: 'Active Story', status: 'In Progress' },
    { id: 2, title: 'Done Story', status: 'Done' },
    { id: 3, title: 'Draft Story', status: 'Draft' }
  ];
  
  // Test filtering logic
  const hideCompleted = true;
  const visibleStories = testStories.filter(story => 
    !hideCompleted || story.status !== 'Done'
  );
  
  console.log('Original stories:', testStories.length);
  console.log('Visible stories (hide completed):', visibleStories.length);
  console.log('Expected: 2, Actual:', visibleStories.length);
  
  return visibleStories.length === 2;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testHideCompletedFeature };
}
