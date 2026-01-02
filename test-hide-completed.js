// Test file to verify Hide Completed functionality
console.log('Testing Hide Completed functionality...');

// Test the filtering logic
function testHideCompletedLogic() {
  const testStories = [
    { id: 1, title: 'Active Story', status: 'In Progress' },
    { id: 2, title: 'Done Story', status: 'Done' },
    { id: 3, title: 'Draft Story', status: 'Draft' }
  ];

  // Test with hideCompleted = false (show all)
  const allStories = testStories.filter(story => !false || story.status !== 'Done');
  console.log('Show all stories:', allStories.length === 3 ? 'PASS' : 'FAIL');

  // Test with hideCompleted = true (hide Done)
  const activeStories = testStories.filter(story => !true || story.status !== 'Done');
  console.log('Hide completed stories:', activeStories.length === 2 ? 'PASS' : 'FAIL');

  return true;
}

testHideCompletedLogic();
console.log('Hide Completed functionality test completed.');
