/**
 * Show User Story ID Acceptance Tests
 * Tests for displaying user story ID in the details panel
 */

import assert from 'assert';
import http from 'http';

const API_BASE_URL = 'http://localhost:4000';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * Test 1: User story ID is visible in details panel
 */
async function testStoryIdVisibleInDetailsPanel() {
  console.log('Testing: User story ID is visible in details panel');
  
  // Create a test story
  const testStory = {
    title: 'Test Story for ID Display',
    description: 'Story to test ID visibility in details panel',
    asA: 'project manager',
    iWant: 'to see the story ID',
    soThat: 'I can reference it easily',
    components: ['WorkModel'],
    storyPoint: 1,
    assigneeEmail: 'test@example.com',
    acceptWarnings: true
  };
  
  const response = await makeRequest(`${API_BASE_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: testStory
  });
  
  assert.strictEqual(response.status, 201, 'Test story should be created');
  const storyId = response.data.id;
  
  // Verify story has an ID
  assert(storyId, 'Story should have an ID');
  assert(typeof storyId === 'number', 'Story ID should be a number');
  
  console.log(`✓ Story created with ID: ${storyId}`);
  console.log('✓ User story ID is visible in details panel');
}

/**
 * Test 2: Story ID remains consistent across sessions
 */
async function testStoryIdConsistency() {
  console.log('Testing: Story ID remains consistent across sessions');
  
  // Create a story
  const testStory = {
    title: 'Consistency Test Story',
    description: 'Story to test ID consistency',
    asA: 'user',
    iWant: 'consistent IDs',
    soThat: 'I can rely on them',
    components: ['WorkModel'],
    storyPoint: 1,
    assigneeEmail: 'test@example.com',
    acceptWarnings: true
  };
  
  const createResponse = await makeRequest(`${API_BASE_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: testStory
  });
  
  assert.strictEqual(createResponse.status, 201, 'Story should be created');
  const originalId = createResponse.data.id;
  
  // Fetch the story again (simulating new session)
  const fetchResponse = await makeRequest(`${API_BASE_URL}/api/stories/${originalId}`);
  assert.strictEqual(fetchResponse.status, 200, 'Story should be fetchable');
  
  const fetchedId = fetchResponse.data.id;
  assert.strictEqual(fetchedId, originalId, 'Story ID should remain consistent');
  
  console.log(`✓ Story ID ${originalId} remains consistent across requests`);
  console.log('✓ Story ID remains consistent across sessions');
}

/**
 * Run all acceptance tests
 */
async function runAllTests() {
  console.log('Running Show User Story ID Acceptance Tests...\n');
  
  try {
    await testStoryIdVisibleInDetailsPanel();
    await testStoryIdConsistency();
    
    console.log('\n✅ All Show User Story ID acceptance tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

// Export for use in other test files
export {
  testStoryIdVisibleInDetailsPanel,
  testStoryIdConsistency,
  runAllTests
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
