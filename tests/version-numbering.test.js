/**
 * Acceptance tests for automatic version numbering
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { generateVersionNumber, getVersionFromEnvironment } from '../scripts/version-generator.js';

test('Version format generation', async () => {
  // Given: a PR number and commit SHA are available
  const prNumber = 990;
  const commitSha = 'abc123def456';
  
  // When: the version numbering system is triggered
  const version = generateVersionNumber(prNumber, commitSha);
  
  // Then: a version string in format PR-{number}-{short-sha} is generated
  assert.strictEqual(version, 'PR-990-abc123d');
});

test('Development environment deployment versioning', async () => {
  // Given: a development environment deployment is initiated
  process.env.GITHUB_PR_NUMBER = '990';
  process.env.GITHUB_SHA = 'abc123def456789';
  
  // When: the automatic versioning system runs
  const version = getVersionFromEnvironment();
  
  // Then: the deployment is tagged with the generated version number
  assert.ok(version.startsWith('PR-990-'));
  assert.strictEqual(version.length, 14); // PR-990-abc123d
  
  // Cleanup
  delete process.env.GITHUB_PR_NUMBER;
  delete process.env.GITHUB_SHA;
});
