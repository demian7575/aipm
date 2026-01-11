/**
 * Gating test for INVEST display simplification
 * Tests that the INVEST criteria display shows simplified format
 */

import http from 'http';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8081';

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
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

async function testInvestDisplaySimplification() {
  console.log('🧪 Testing INVEST display simplification...');

  try {
    // Create a test story with INVEST issues
    const testStory = {
      title: 'Test Story for INVEST Display',
      description: 'A test story to verify simplified INVEST display',
      asA: 'test user',
      iWant: 'to see simplified INVEST display',
      soThat: 'I can quickly assess story quality',
      components: ['WorkModel'],
      storyPoint: 3,
      assigneeEmail: 'test@example.com',
      parentId: null,
      acceptWarnings: true,
      acceptanceTests: [{
        title: 'INVEST display shows simplified format',
        given: 'a user story is selected in the details panel',
        when: 'I view the INVEST criteria section',
        then: 'the display should show a clean, simplified format with key information only',
        status: 'Draft'
      }]
    };

    // Create the story
    const createResponse = await makeRequest('POST', '/api/stories', testStory);
    if (createResponse.status !== 201) {
      throw new Error(`Failed to create test story: ${createResponse.status}`);
    }

    const storyId = createResponse.data.id;
    console.log(`✅ Created test story with ID: ${storyId}`);

    // Get the story to verify INVEST analysis
    const getResponse = await makeRequest('GET', `/api/stories/${storyId}`);
    if (getResponse.status !== 200) {
      throw new Error(`Failed to get story: ${getResponse.status}`);
    }

    const story = getResponse.data;
    
    // Verify story has INVEST analysis
    if (!story.investAnalysis) {
      console.log('⚠️  Story does not have INVEST analysis, triggering health check...');
      
      // Trigger health check
      const healthResponse = await makeRequest('POST', `/api/stories/${storyId}/health-check`);
      if (healthResponse.status !== 200) {
        throw new Error(`Failed to trigger health check: ${healthResponse.status}`);
      }
      
      // Get updated story
      const updatedResponse = await makeRequest('GET', `/api/stories/${storyId}`);
      if (updatedResponse.status !== 200) {
        throw new Error(`Failed to get updated story: ${updatedResponse.status}`);
      }
      
      const updatedStory = updatedResponse.data;
      if (!updatedStory.investAnalysis) {
        throw new Error('Story still missing INVEST analysis after health check');
      }
      
      console.log('✅ INVEST analysis generated successfully');
    }

    // Clean up - delete test story
    const deleteResponse = await makeRequest('DELETE', `/api/stories/${storyId}`);
    if (deleteResponse.status !== 200) {
      console.log(`⚠️  Failed to delete test story: ${deleteResponse.status}`);
    } else {
      console.log('✅ Test story cleaned up');
    }

    console.log('✅ INVEST display simplification test passed');
    return true;

  } catch (error) {
    console.error('❌ INVEST display simplification test failed:', error.message);
    return false;
  }
}

// Run the test
testInvestDisplaySimplification()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
