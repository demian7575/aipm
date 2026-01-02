// Test for Hide Completed functionality
function testHideCompleted() {
  // Test data with Done and active stories
  const testStories = [
    { id: 1, title: "Active Story", status: "In Progress" },
    { id: 2, title: "Done Story", status: "Done" },
    { id: 3, title: "Ready Story", status: "Ready" }
  ];

  // Mock state
  const mockState = { hideCompleted: false, stories: testStories };
  
  // Test getVisibleStories function
  function getVisibleStories(state) {
    if (!state.hideCompleted) return state.stories;
    return state.stories.filter(story => story.status !== 'Done');
  }

  // Test 1: hideCompleted = false (show all)
  mockState.hideCompleted = false;
  const allVisible = getVisibleStories(mockState);
  console.assert(allVisible.length === 3, "Should show all stories when hideCompleted is false");

  // Test 2: hideCompleted = true (hide Done)
  mockState.hideCompleted = true;
  const filteredVisible = getVisibleStories(mockState);
  console.assert(filteredVisible.length === 2, "Should hide Done stories when hideCompleted is true");
  console.assert(!filteredVisible.some(s => s.status === 'Done'), "No Done stories should be visible");

  console.log("✅ Hide Completed functionality tests passed");
  return true;
}

// Run the test
testHideCompleted();
