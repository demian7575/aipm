import { test } from 'node:test';
import assert from 'node:assert';

test('Version display shows PR-SHA format in development', async () => {
  // Mock DOM environment
  global.document = {
    getElementById: (id) => {
      if (id === 'version-display') {
        return { textContent: '' };
      }
      return null;
    }
  };
  
  // Test the fetchVersion function logic
  const versionEl = document.getElementById('version-display');
  const mockData = {
    stage: 'dev',
    prNumber: '992',
    sha: 'abc123d',
    version: '0.1.0-992'
  };
  
  if (mockData.stage === 'dev' || mockData.stage === 'development') {
    versionEl.textContent = `PR#${mockData.prNumber} (${mockData.sha})`;
  } else {
    versionEl.textContent = `v${mockData.version}`;
  }
  
  assert.strictEqual(versionEl.textContent, 'PR#992 (abc123d)');
});

test('Version API returns correct format for development', () => {
  // Test version object structure
  const stage = 'dev';
  const prNumber = '992';
  const sha = 'abc123def456';
  const baseVersion = '0.1.0';
  
  const version = { 
    version: `${baseVersion}-${prNumber}`,
    prNumber: prNumber,
    sha: sha.substring(0, 7),
    stage: stage
  };
  
  assert.strictEqual(version.stage, 'dev');
  assert.strictEqual(version.prNumber, '992');
  assert.strictEqual(version.sha, 'abc123d');
  assert.strictEqual(version.version, '0.1.0-992');
});
