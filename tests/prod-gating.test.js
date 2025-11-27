import test from 'node:test';
import assert from 'node:assert/strict';

// Production environment configuration
const PROD_API_BASE = 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod';
const PROD_FRONTEND_BASE = 'http://aipm-prod-frontend-hosting.s3-website-us-east-1.amazonaws.com';

// Gating tests for production environment
test('Production Environment Gating Tests', async (t) => {
  
  await t.test('API Gateway Health Check', async () => {
    const response = await fetch(`${PROD_API_BASE}/`);
    assert.ok(response.status === 200 || response.status === 404, 'API Gateway should be accessible');
  });

  await t.test('CORS Headers Present', async () => {
    const response = await fetch(`${PROD_API_BASE}/api/stories`, {
      method: 'OPTIONS',
      headers: {
        'Origin': PROD_FRONTEND_BASE,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
    const corsMethods = response.headers.get('Access-Control-Allow-Methods');
    
    assert.ok(corsOrigin === '*' || corsOrigin === PROD_FRONTEND_BASE, 'CORS origin should be configured');
    assert.ok(corsMethods && corsMethods.includes('GET'), 'CORS methods should include GET');
  });

  await t.test('Stories API Endpoint', async () => {
    const response = await fetch(`${PROD_API_BASE}/api/stories`);
    assert.equal(response.status, 200, 'Stories endpoint should return 200');
    
    const stories = await response.json();
    assert.ok(Array.isArray(stories), 'Stories should return an array');
  });

  await t.test('Frontend Static Files', async () => {
    const indexResponse = await fetch(`${PROD_FRONTEND_BASE}/index.html`);
    assert.equal(indexResponse.status, 200, 'Frontend index.html should be accessible');
    
    const configResponse = await fetch(`${PROD_FRONTEND_BASE}/config.js`);
    assert.equal(configResponse.status, 200, 'Frontend config.js should be accessible');
    
    const configText = await configResponse.text();
    assert.ok(configText.includes(PROD_API_BASE), 'Config should point to prod API');
  });

  await t.test('DynamoDB Tables Accessible', async () => {
    // Test by creating and retrieving a story
    const testStory = {
      title: 'Prod Gating Test Story',
      description: 'Test story for production gating',
      status: 'Draft',
      points: 1,
      assignee: 'test@example.com',
      components: ['System']
    };

    const createResponse = await fetch(`${PROD_API_BASE}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testStory)
    });

    assert.ok(createResponse.status === 200 || createResponse.status === 201, 'Should be able to create stories');
    
    if (createResponse.ok) {
      const createdStory = await createResponse.json();
      assert.ok(createdStory.id, 'Created story should have an ID');
      
      // Clean up - delete the test story
      await fetch(`${PROD_API_BASE}/api/stories/${createdStory.id}`, {
        method: 'DELETE'
      });
    }
  });

});

// Production performance and reliability tests
test('Production Performance Gates', async (t) => {
  
  await t.test('API Response Time', async () => {
    const start = Date.now();
    const response = await fetch(`${PROD_API_BASE}/api/stories`);
    const duration = Date.now() - start;
    
    assert.ok(response.ok, 'API should respond successfully');
    assert.ok(duration < 3000, `API should respond within 3 seconds, took ${duration}ms`);
  });

  await t.test('Frontend Load Time', async () => {
    const start = Date.now();
    const response = await fetch(`${PROD_FRONTEND_BASE}/index.html`);
    const duration = Date.now() - start;
    
    assert.equal(response.status, 200, 'Frontend should load successfully');
    assert.ok(duration < 2000, `Frontend should load within 2 seconds, took ${duration}ms`);
  });

  await t.test('Lambda Cold Start Performance', async () => {
    // Test multiple rapid requests to check cold start handling
    const requests = Array(3).fill().map(() => 
      fetch(`${PROD_API_BASE}/api/stories`)
    );
    
    const responses = await Promise.all(requests);
    responses.forEach((response, index) => {
      assert.ok(response.ok, `Request ${index + 1} should succeed`);
    });
  });

});
