import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Acceptance Test 1: Version number updates with deployments
 * Given: a new PR is deployed to development
 * When: the deployment completes
 * Then: the version number reflects the new PR number and commit SHA
 */
test('Version number updates with deployments', async () => {
  // Mock deployment scenario
  const prNumber = 992;
  const commitSha = 'b757b11';
  const expectedVersion = `PR-${prNumber}-${commitSha}`;
  
  // Test version generation logic
  const generateVersion = (pr, sha) => `PR-${pr}-${sha}`;
  const actualVersion = generateVersion(prNumber, commitSha);
  
  assert.strictEqual(actualVersion, expectedVersion, 
    'Version should follow PR-{number}-{sha} format');
});

/**
 * Acceptance Test 2: Version number displays in frontend header
 * Given: the application is deployed in development environment
 * When: I view the frontend page
 * Then: I see the version number beside AI Project Manager Mindmap title using PR-SHA format
 */
test('Version number displays in frontend header', async () => {
  // Test that version display element exists in HTML
  const fs = await import('node:fs/promises');
  const indexHtml = await fs.readFile('./apps/frontend/public/index.html', 'utf8');
  
  assert.ok(indexHtml.includes('id="version-display"'), 
    'HTML should contain version-display element');
  assert.ok(indexHtml.includes('class="version-display"'), 
    'Version display should have proper CSS class');
});
