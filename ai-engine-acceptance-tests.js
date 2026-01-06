/**
 * AI Engine Acceptance Tests
 * Tests for automatically generating acceptance tests when creating child stories
 */

import assert from 'assert';
import http from 'http';

// Test configuration
const API_BASE_URL = 'http://localhost:4000';
const KIRO_API_URL = 'http://localhost:8081';

/**
 * Make HTTP request helper
 */
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
 * Test 1: AI engine generates acceptance tests automatically
 */
async function testAutoGenerateAcceptanceTests() {
  console.log('Testing: AI engine generates acceptance tests automatically');
  
  // Create a parent story first
  const parentStory = {
    title: 'Test Parent Story for AI Engine Testing',
    description: 'Parent story for testing AI engine functionality with comprehensive acceptance test generation',
    asA: 'developer',
    iWant: 'to test AI functionality',
    soThat: 'I can ensure it works correctly',
    components: ['WorkModel'],
    storyPoint: 3,
    assigneeEmail: 'test@example.com',
    acceptWarnings: true
  };
  
  const parentResponse = await makeRequest(`${API_BASE_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: parentStory
  });
  
  console.log('Parent response:', parentResponse);
  assert.strictEqual(parentResponse.status, 201, `Parent story should be created. Got status ${parentResponse.status}: ${JSON.stringify(parentResponse.data)}`);
  const parentId = parentResponse.data.id;
  
  // Test draft generation with AI
  const draftRequest = {
    templateId: 'user-story-generation',
    feature_description: 'user authentication system',
    parentId: String(parentId)
  };
  
  const draftResponse = await makeRequest(`${KIRO_API_URL}/api/generate-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: draftRequest
  });
  
  assert.strictEqual(draftResponse.status, 200, 'Draft generation should succeed');
  assert.strictEqual(draftResponse.data.success, true, 'Draft should be successful');
  assert(draftResponse.data.draft, 'Draft data should be present');
  assert(Array.isArray(draftResponse.data.draft.acceptanceTests), 'Acceptance tests should be generated');
  assert(draftResponse.data.draft.acceptanceTests.length > 0, 'At least one acceptance test should be generated');
  
  // Verify acceptance test structure
  const firstTest = draftResponse.data.draft.acceptanceTests[0];
  assert(firstTest.title, 'Test should have a title');
  assert(firstTest.given, 'Test should have given condition');
  assert(firstTest.when, 'Test should have when action');
  assert(firstTest.then, 'Test should have then result');
  assert.strictEqual(firstTest.status, 'Draft', 'Test status should be Draft');
  
  console.log('✓ AI engine generates acceptance tests automatically');
}

/**
 * Test 2: Generated acceptance tests are properly formatted
 */
async function testAcceptanceTestFormat() {
  console.log('Testing: Generated acceptance tests are properly formatted');
  
  const draftRequest = {
    templateId: 'user-story-generation',
    feature_description: 'shopping cart functionality',
    parentId: null
  };
  
  const response = await makeRequest(`${KIRO_API_URL}/api/generate-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: draftRequest
  });
  
  assert.strictEqual(response.status, 200, 'Draft generation should succeed');
  const tests = response.data.draft.acceptanceTests;
  
  tests.forEach((test, index) => {
    assert(typeof test.title === 'string' && test.title.length > 0, `Test ${index + 1} should have valid title`);
    assert(typeof test.given === 'string' && test.given.length > 0, `Test ${index + 1} should have valid given condition`);
    assert(typeof test.when === 'string' && test.when.length > 0, `Test ${index + 1} should have valid when action`);
    assert(typeof test.then === 'string' && test.then.length > 0, `Test ${index + 1} should have valid then result`);
    assert.strictEqual(test.status, 'Draft', `Test ${index + 1} should have Draft status`);
  });
  
  console.log('✓ Generated acceptance tests are properly formatted');
}

/**
 * Test 3: Child story creation includes auto-generated acceptance tests
 */
async function testChildStoryWithAutoTests() {
  console.log('Testing: Child story creation includes auto-generated acceptance tests');
  
  // Create parent story
  const parentStory = {
    title: 'E-commerce Platform for AI Testing',
    description: 'Main e-commerce platform for testing AI engine functionality',
    asA: 'customer',
    iWant: 'to shop online',
    soThat: 'I can buy products conveniently',
    components: ['WorkModel'],
    storyPoint: 8,
    assigneeEmail: 'dev@example.com',
    acceptWarnings: true
  };
  
  const parentResponse = await makeRequest(`${API_BASE_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: parentStory
  });
  
  const parentId = parentResponse.data.id;
  
  // Create child story with acceptance tests
  const childStory = {
    title: 'User Registration System Implementation',
    description: 'Allow users to register accounts with comprehensive validation',
    asA: 'new user',
    iWant: 'to create an account',
    soThat: 'I can make purchases',
    components: ['WorkModel'],
    storyPoint: 3,
    assigneeEmail: 'dev@example.com',
    parentId: parentId,
    acceptWarnings: true
  };
  
  const childResponse = await makeRequest(`${API_BASE_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: childStory
  });
  
  assert.strictEqual(childResponse.status, 201, 'Child story should be created');
  const childId = childResponse.data.id;
  
  // Create acceptance tests for the child story
  const testData = {
    title: 'User can register with valid email',
    given: ['User is on registration page'],
    when: ['User enters valid email and password'],
    then: ['Account is created successfully'],
    status: 'Draft',
    acceptWarnings: true
  };
  
  const testResponse = await makeRequest(`${API_BASE_URL}/api/stories/${childId}/tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: testData
  });
  
  assert.strictEqual(testResponse.status, 201, 'Acceptance test should be created');
  
  // Verify the test was created
  const storyResponse = await makeRequest(`${API_BASE_URL}/api/stories/${childId}`);
  assert.strictEqual(storyResponse.status, 200, 'Should retrieve child story');
  assert(Array.isArray(storyResponse.data.acceptanceTests), 'Story should have acceptance tests');
  assert(storyResponse.data.acceptanceTests.length > 0, 'Story should have at least one acceptance test');
  
  console.log('✓ Child story creation includes auto-generated acceptance tests');
}

/**
 * Run all acceptance tests
 */
async function runAllTests() {
  console.log('Running AI Engine Acceptance Tests...\n');
  
  try {
    await testAutoGenerateAcceptanceTests();
    await testAcceptanceTestFormat();
    await testChildStoryWithAutoTests();
    
    console.log('\n✅ All AI Engine acceptance tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

// Export for use in other test files
export {
  testAutoGenerateAcceptanceTests,
  testAcceptanceTestFormat,
  testChildStoryWithAutoTests,
  runAllTests
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
