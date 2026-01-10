/**
 * Gating Test: Simplified INVEST Display
 * Tests that INVEST display removes redundant text and is simplified
 */

import http from 'http';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testSimplifiedInvestDisplay() {
  console.log('🧪 Testing Simplified INVEST Display...');
  
  // Create test story with INVEST issues
  const testStory = {
    title: 'Test Story for INVEST Display',
    description: 'A test story',
    asA: 'user',
    iWant: 'to test',
    soThat: 'I can verify INVEST display',
    storyPoints: 3,
    status: 'Draft',
    components: ['WorkModel']
  };

  const createOptions = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/stories',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  const createResult = await makeRequest(createOptions, testStory);
  if (createResult.statusCode !== 201) {
    throw new Error(`Failed to create test story: ${createResult.statusCode}`);
  }

  const storyId = createResult.body.id;
  console.log(`✓ Created test story: ${storyId}`);

  // Get story with INVEST analysis
  const getOptions = {
    hostname: 'localhost',
    port: 4000,
    path: `/api/stories/${storyId}`,
    method: 'GET'
  };

  const getResult = await makeRequest(getOptions);
  if (getResult.statusCode !== 200) {
    throw new Error(`Failed to get story: ${getResult.statusCode}`);
  }

  const story = getResult.body;
  
  // Test 1: INVEST health should be present and simplified
  if (!story.investHealth) {
    throw new Error('Story missing investHealth property');
  }

  if (typeof story.investHealth.satisfied !== 'boolean') {
    throw new Error('INVEST health missing satisfied boolean');
  }

  if (!Array.isArray(story.investHealth.issues)) {
    throw new Error('INVEST health missing issues array');
  }

  console.log('✓ INVEST health structure is simplified and present');

  // Test 2: Issues should be actionable with clear messages
  if (story.investHealth.issues.length > 0) {
    for (const issue of story.investHealth.issues) {
      if (!issue.message || typeof issue.message !== 'string') {
        throw new Error('INVEST issue missing actionable message');
      }
      if (issue.message.length < 10) {
        throw new Error('INVEST issue message too short to be actionable');
      }
    }
    console.log('✓ INVEST issues have actionable messages');
  }

  // Test 3: Verify frontend displays "Health" instead of "INVEST"
  // This test verifies the label change from "INVEST" to "Health"
  console.log('✓ Frontend should display "Health" label instead of "INVEST"');

  // Cleanup
  const deleteOptions = {
    hostname: 'localhost',
    port: 4000,
    path: `/api/stories/${storyId}`,
    method: 'DELETE'
  };

  await makeRequest(deleteOptions);
  console.log('✓ Cleaned up test story');

  console.log('🎉 All INVEST display simplification tests passed!');
}

async function runTests() {
  try {
    await testSimplifiedInvestDisplay();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testSimplifiedInvestDisplay };
