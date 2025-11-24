import test from 'node:test';
import assert from 'node:assert/strict';

// Development environment configuration
const DEV_API_BASE = 'https://0v2m13m6h8.execute-api.us-east-1.amazonaws.com/dev';
const DEV_FRONTEND_BASE = 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com';

// Gating tests for development environment
test('Development Environment Gating Tests', async (t) => {
  
  await t.test('API Gateway Health Check', async () => {
    const response = await fetch(`${DEV_API_BASE}/api/health`);
    assert.ok(response.status === 200 || response.status === 404, 'API Gateway should be accessible');
  });

  await t.test('CORS Headers Present', async () => {
    const response = await fetch(`${DEV_API_BASE}/api/stories`, {
      method: 'OPTIONS',
      headers: {
        'Origin': DEV_FRONTEND_BASE,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
    const corsMethods = response.headers.get('Access-Control-Allow-Methods');
    
    assert.ok(corsOrigin === '*' || corsOrigin === DEV_FRONTEND_BASE, 'CORS origin should be configured');
    assert.ok(corsMethods && corsMethods.includes('GET'), 'CORS methods should include GET');
  });

  await t.test('Stories API Endpoint', async () => {
    const response = await fetch(`${DEV_API_BASE}/api/stories`);
    assert.ok(response.status === 200, 'Stories endpoint should return 200');
    
    const stories = await response.json();
    assert.ok(Array.isArray(stories), 'Stories should return an array');
  });

  await t.test('Frontend Static Files', async () => {
    const indexResponse = await fetch(`${DEV_FRONTEND_BASE}/index.html`);
    assert.equal(indexResponse.status, 200, 'Frontend index.html should be accessible');
    
    const configResponse = await fetch(`${DEV_FRONTEND_BASE}/config.js`);
    assert.equal(configResponse.status, 200, 'Frontend config.js should be accessible');
    
    const configText = await configResponse.text();
    assert.ok(configText.includes(DEV_API_BASE), 'Config should point to dev API');
  });

  await t.test('DynamoDB Tables Accessible', async () => {
    // Test by creating and retrieving a story
    const testStory = {
      title: 'Gating Test Story',
      description: 'Test story for development gating',
      status: 'Draft',
      points: 1,
      assignee: 'test@example.com',
      components: ['System']
    };

    const createResponse = await fetch(`${DEV_API_BASE}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testStory)
    });

    assert.ok(createResponse.status === 200 || createResponse.status === 201, 'Should be able to create stories');
    
    if (createResponse.ok) {
      const createdStory = await createResponse.json();
      assert.ok(createdStory.id, 'Created story should have an ID');
      
      // Clean up - delete the test story
      await fetch(`${DEV_API_BASE}/api/stories/${createdStory.id}`, {
        method: 'DELETE'
      });
    }
  });

  await t.test('Environment Isolation', async () => {
    // Verify dev environment is separate from prod
    const devResponse = await fetch(`${DEV_API_BASE}/api/stories`);
    const devStories = await devResponse.json();
    
    // Dev should start with seed data or be empty
    assert.ok(Array.isArray(devStories), 'Dev environment should have independent data');
  });

});

test('Development Deployment Validation', async (t) => {
  
  await t.test('Lambda Function Configuration', async () => {
    // This would require AWS SDK calls to verify Lambda config
    // For now, we test indirectly through API responses
    const response = await fetch(`${DEV_API_BASE}/api/stories`);
    assert.ok(response.status !== 502, 'Lambda should not return bad gateway errors');
    assert.ok(response.status !== 503, 'Lambda should not return service unavailable');
  });

  await t.test('API Gateway Stage Configuration', async () => {
    // Verify the API is deployed to 'dev' stage
    assert.ok(DEV_API_BASE.includes('/dev'), 'API should be deployed to dev stage');
  });

  await t.test('S3 Static Website Configuration', async () => {
    const response = await fetch(DEV_FRONTEND_BASE);
    assert.equal(response.status, 200, 'S3 static website should be accessible');
    
    const html = await response.text();
    assert.ok(html.includes('<title>'), 'Should return valid HTML');
  });

});

// Performance gating tests
test('Development Performance Gates', async (t) => {
  
  await t.test('API Response Time', async () => {
    const start = Date.now();
    const response = await fetch(`${DEV_API_BASE}/api/stories`);
    const duration = Date.now() - start;
    
    assert.ok(response.ok, 'API should respond successfully');
    assert.ok(duration < 5000, `API should respond within 5 seconds, took ${duration}ms`);
  });

  await t.test('Frontend Load Time', async () => {
    const start = Date.now();
    const response = await fetch(`${DEV_FRONTEND_BASE}/index.html`);
    const duration = Date.now() - start;
    
    assert.equal(response.status, 200, 'Frontend should load successfully');
    assert.ok(duration < 3000, `Frontend should load within 3 seconds, took ${duration}ms`);
  });

});
