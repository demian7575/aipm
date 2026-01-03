/**
 * Acceptance Test: Story ID Display
 * 
 * Test: Story ID is visible
 * Given: I am viewing a user story
 * When: I look at the story details
 * Then: the unique story ID is clearly displayed
 */

import fs from 'fs';

function testStoryIdDisplay() {
  console.log('🧪 Testing Story ID Display Feature...');
  
  // Test 1: Check if story ID is displayed in details panel
  const appJs = fs.readFileSync('/home/ec2-user/aipm/apps/frontend/public/app.js', 'utf8');
  
  // Verify dedicated Story ID field exists
  const storyIdFieldPattern = /<label>Story ID<\/label>/;
  if (storyIdFieldPattern.test(appJs)) {
    console.log('✅ Dedicated Story ID field is present');
  } else {
    console.log('❌ Dedicated Story ID field not found');
    return false;
  }
  
  // Verify story ID is displayed in the field
  const storyIdDisplayPattern = /story\.id.*<\/div>/;
  if (storyIdDisplayPattern.test(appJs)) {
    console.log('✅ Story ID is displayed in dedicated field');
  } else {
    console.log('❌ Story ID not displayed in dedicated field');
    return false;
  }
  
  // Test 2: Check if story ID is displayed in outline
  const outlineDisplayPattern = /\[.*story\.id.*\].*story\.title/;
  if (outlineDisplayPattern.test(appJs)) {
    console.log('✅ Story ID is displayed in outline');
  } else {
    console.log('❌ Story ID not found in outline');
    return false;
  }
  
  // Test 3: Check if story ID is displayed in mindmap
  const mindmapDisplayPattern = /\[.*story\.id.*\].*title/;
  if (mindmapDisplayPattern.test(appJs)) {
    console.log('✅ Story ID is displayed in mindmap');
  } else {
    console.log('❌ Story ID not found in mindmap');
    return false;
  }
  
  // Test 4: Check if styling is applied
  const stylesCSS = fs.readFileSync('/home/ec2-user/aipm/apps/frontend/public/styles.css', 'utf8');
  const storyIdStylePattern = /\.story-id\s*{/;
  if (storyIdStylePattern.test(stylesCSS)) {
    console.log('✅ Story ID styling is applied');
  } else {
    console.log('❌ Story ID styling not found');
    return false;
  }
  
  console.log('✅ All Story ID Display tests passed!');
  return true;
}

// Run the test
const success = testStoryIdDisplay();
process.exit(success ? 0 : 1);
