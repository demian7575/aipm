import test from 'node:test';
import assert from 'node:assert/strict';

// Environment configurations
const ENVIRONMENTS = {
  dev: {
    api: 'https://0v2m13m6h8.execute-api.us-east-1.amazonaws.com/dev',
    frontend: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com',
    stage: 'dev'
  },
  prod: {
    api: 'https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod',
    frontend: 'http://aipm-prod-frontend-hosting.s3-website-us-east-1.amazonaws.com',
    stage: 'prod'
  }
};

// Test each environment
Object.entries(ENVIRONMENTS).forEach(([envName, config]) => {
  test(`${envName.toUpperCase()} Environment Deployment Gating`, async (t) => {
    
    // Frontend Tests
    await t.test(`${envName}: Frontend S3 Deployment`, async () => {
      const response = await fetch(`${config.frontend}/index.html`);
      assert.equal(response.status, 200, 'Frontend should be accessible');
      
      const html = await response.text();
      assert.ok(html.includes('<title>'), 'Should return valid HTML');
      assert.ok(html.includes('app.js'), 'Should include app.js script');
    });

    await t.test(`${envName}: Frontend Config`, async () => {
      const response = await fetch(`${config.frontend}/config.js`);
      assert.equal(response.status, 200, 'Config.js should be accessible');
      
      const configText = await response.text();
      assert.ok(configText.includes(config.api), `Config should point to ${envName} API`);
    });

    // Backend Lambda Tests
    await t.test(`${envName}: Lambda Function Health`, async () => {
      const response = await fetch(`${config.api}/`);
      assert.ok(response.status === 200 || response.status === 404, 'Lambda should be responsive');
    });

    await t.test(`${envName}: API Gateway CORS`, async () => {
      const response = await fetch(`${config.api}/api/stories`, {
        method: 'OPTIONS',
        headers: {
          'Origin': config.frontend,
          'Access-Control-Request-Method': 'GET'
        }
      });
      
      const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
      assert.ok(corsOrigin === '*', 'CORS should allow all origins');
    });

    // Storage (DynamoDB) Tests
    await t.test(`${envName}: DynamoDB Stories Table`, async () => {
      const response = await fetch(`${config.api}/api/stories`);
      assert.equal(response.status, 200, 'Stories endpoint should work');
      
      const stories = await response.json();
      assert.ok(Array.isArray(stories), 'Should return stories array');
    });

    await t.test(`${envName}: DynamoDB Write Operations`, async () => {
      const testStory = {
        title: `Gating Test ${Date.now()}`,
        description: 'Test story for deployment validation',
        status: 'Draft'
      };

      const createResponse = await fetch(`${config.api}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testStory)
      });

      assert.ok(createResponse.status === 200 || createResponse.status === 201, 'Should create story');
      
      if (createResponse.ok) {
        const created = await createResponse.json();
        assert.ok(created.id, 'Created story should have ID');
        
        // Cleanup
        await fetch(`${config.api}/api/stories/${created.id}`, { method: 'DELETE' });
      }
    });

    // Performance Tests
    await t.test(`${envName}: API Performance`, async () => {
      const start = Date.now();
      const response = await fetch(`${config.api}/api/stories`);
      const duration = Date.now() - start;
      
      assert.ok(response.ok, 'API should respond successfully');
      assert.ok(duration < 5000, `API response should be under 5s, was ${duration}ms`);
    });

    await t.test(`${envName}: Frontend Performance`, async () => {
      const start = Date.now();
      const response = await fetch(`${config.frontend}/index.html`);
      const duration = Date.now() - start;
      
      assert.equal(response.status, 200, 'Frontend should load');
      assert.ok(duration < 3000, `Frontend load should be under 3s, was ${duration}ms`);
    });

  });
});

// Cross-environment isolation tests
test('Environment Isolation Validation', async (t) => {
  
  await t.test('Dev/Prod API Separation', async () => {
    assert.notEqual(ENVIRONMENTS.dev.api, ENVIRONMENTS.prod.api, 'Dev and prod APIs should be different');
    assert.ok(ENVIRONMENTS.dev.api.includes('/dev'), 'Dev API should include /dev stage');
    assert.ok(ENVIRONMENTS.prod.api.includes('/prod'), 'Prod API should include /prod stage');
  });

  await t.test('Dev/Prod Frontend Separation', async () => {
    assert.notEqual(ENVIRONMENTS.dev.frontend, ENVIRONMENTS.prod.frontend, 'Dev and prod frontends should be different');
    assert.ok(ENVIRONMENTS.dev.frontend.includes('dev'), 'Dev frontend should include dev in URL');
    assert.ok(ENVIRONMENTS.prod.frontend.includes('prod'), 'Prod frontend should include prod in URL');
  });

  await t.test('Data Isolation', async () => {
    // Create test story in dev
    const devStory = {
      title: `Dev Test ${Date.now()}`,
      description: 'Dev environment test story'
    };

    const devResponse = await fetch(`${ENVIRONMENTS.dev.api}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(devStory)
    });

    if (devResponse.ok) {
      const created = await devResponse.json();
      
      // Verify it doesn't appear in prod
      const prodResponse = await fetch(`${ENVIRONMENTS.prod.api}/api/stories`);
      const prodStories = await prodResponse.json();
      
      const foundInProd = prodStories.find(s => s.id === created.id);
      assert.ok(!foundInProd, 'Dev stories should not appear in prod');
      
      // Cleanup
      await fetch(`${ENVIRONMENTS.dev.api}/api/stories/${created.id}`, { method: 'DELETE' });
    }
  });

});

// Deployment completeness tests
test('Deployment Completeness Validation', async (t) => {
  
  await t.test('All Required Endpoints Available', async () => {
    const requiredEndpoints = ['/api/stories', '/api/deploy-staging'];
    
    for (const [envName, config] of Object.entries(ENVIRONMENTS)) {
      for (const endpoint of requiredEndpoints) {
        const response = await fetch(`${config.api}${endpoint}`, {
          method: endpoint === '/api/stories' ? 'GET' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: endpoint === '/api/deploy-staging' ? JSON.stringify({}) : undefined
        });
        
        assert.ok(response.status !== 404, `${envName}: ${endpoint} should exist`);
      }
    }
  });

  await t.test('Frontend Assets Complete', async () => {
    const requiredAssets = ['/index.html', '/app.js', '/styles.css', '/config.js'];
    
    for (const [envName, config] of Object.entries(ENVIRONMENTS)) {
      for (const asset of requiredAssets) {
        const response = await fetch(`${config.frontend}${asset}`);
        assert.equal(response.status, 200, `${envName}: ${asset} should be available`);
      }
    }
  });

});
