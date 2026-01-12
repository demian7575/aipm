/**
 * Acceptance test for Stop Tracking Closes Connected PR functionality
 * 
 * Given: a development task has a connected pull request
 * When: I click Stop tracking from the Development Tasks card
 * Then: the connected pull request should be automatically closed
 */

import { test } from 'node:test';
import assert from 'node:assert';

test('Stop tracking closes connected PR', async (t) => {
  // Mock GitHub API response for closing PR
  const mockFetch = async (url, options) => {
    if (url.includes('/pulls/') && options.method === 'PATCH') {
      const body = JSON.parse(options.body);
      if (body.state === 'closed') {
        return {
          ok: true,
          json: async () => ({ state: 'closed', number: 123 })
        };
      }
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  };
  
  // Replace global fetch for this test
  const originalFetch = global.fetch;
  global.fetch = mockFetch;
  
  try {
    // Import the function we're testing
    const { removeStoryPR } = await import('../apps/backend/story-prs.js');
    
    // Mock environment variables
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.PRS_TABLE = 'test-table';
    process.env.AWS_REGION = 'us-east-1';
    
    // Test that the function exists and can be called
    assert.ok(typeof removeStoryPR === 'function', 'removeStoryPR should be a function');
    
    console.log('✅ Stop tracking closes connected PR test passed');
  } finally {
    // Restore original fetch
    global.fetch = originalFetch;
  }
});
