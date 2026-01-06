import http from 'http';

/**
 * Gating test for Story ID display functionality
 * Tests acceptance criteria from TASK-1767685743340-1767685754273.md
 */
async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runGatingTests() {
  console.log('🧪 Running gating tests for Story ID display');
  
  try {
    // Test 1: Story ID remains consistent across sessions
    const response1 = await makeRequest('/api/stories');
    if (response1.status !== 200) throw new Error('API not available');
    
    const testStory = response1.data.find(s => s.id);
    if (!testStory) throw new Error('No stories found');
    
    const response2 = await makeRequest(`/api/stories/${testStory.id}`);
    if (response2.status !== 200) throw new Error('Story fetch failed');
    
    if (response2.data.id !== testStory.id) {
      throw new Error('Story ID inconsistent across sessions');
    }
    console.log('✅ Test 1 PASSED: Story ID remains consistent');
    
    // Test 2: User story ID is visible in details panel
    const storyData = response2.data;
    if (!storyData.id || !storyData.title) {
      throw new Error('Story missing required fields for details panel');
    }
    console.log('✅ Test 2 PASSED: Story has ID for details panel display');
    
    console.log('🎉 All gating tests passed');
    return true;
  } catch (error) {
    console.error('❌ Gating test failed:', error.message);
    return false;
  }
}

runGatingTests().then(success => process.exit(success ? 0 : 1));
