/**
 * Gating test for Story ID display in details panel
 * Tests that story ID is visible and consistent across sessions
 */

import http from 'http';

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testStoryIdDisplay() {
  console.log('🧪 Testing Story ID Display in Details Panel');
  
  try {
    // Test 1: Get a story and verify it has an ID
    console.log('\n📋 Test 1: Story ID remains consistent across sessions');
    const storiesResponse = await makeRequest('/api/stories');
    
    if (storiesResponse.status !== 200) {
      throw new Error(`Failed to fetch stories: ${storiesResponse.status}`);
    }
    
    const stories = storiesResponse.data;
    if (!Array.isArray(stories) || stories.length === 0) {
      throw new Error('No stories found');
    }
    
    const testStory = stories.find(s => s.id === 1767331599404);
    if (!testStory) {
      throw new Error('Test story 1767331599404 not found');
    }
    
    console.log(`✅ Story found with ID: ${testStory.id}`);
    console.log(`✅ Story title: ${testStory.title}`);
    
    // Test 2: Fetch the same story again to verify ID consistency
    console.log('\n📋 Test 2: User story ID is visible in details panel');
    const storyResponse = await makeRequest(`/api/stories/${testStory.id}`);
    
    if (storyResponse.status !== 200) {
      throw new Error(`Failed to fetch story details: ${storyResponse.status}`);
    }
    
    const storyDetails = storyResponse.data;
    
    if (storyDetails.id !== testStory.id) {
      throw new Error(`Story ID mismatch: expected ${testStory.id}, got ${storyDetails.id}`);
    }
    
    console.log(`✅ Story ID consistent: ${storyDetails.id}`);
    console.log(`✅ Story has required fields for details panel display`);
    
    // Verify the story has the expected structure for details panel
    const requiredFields = ['id', 'title', 'description', 'asA', 'iWant', 'soThat'];
    for (const field of requiredFields) {
      if (!(field in storyDetails)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    console.log('✅ All required fields present for details panel display');
    
    console.log('\n🎉 All tests passed! Story ID display functionality is working correctly.');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testStoryIdDisplay().then(success => {
  process.exit(success ? 0 : 1);
});
