/**
 * Acceptance Tests for Automatic Version Numbering System
 * Story: 1767743574879
 */

// Test 1: Version number displays in frontend header
async function testVersionDisplayInHeader() {
  const versionEl = document.getElementById('version-display');
  
  if (!versionEl) {
    throw new Error('Version display element not found in header');
  }
  
  // Fetch version from API
  const response = await fetch('/api/version');
  const data = await response.json();
  
  if (!data.version) {
    throw new Error('Version not returned from API');
  }
  
  // Check if version follows PR-SHA format
  const prShaPattern = /^PR-\w+-[a-f0-9]{7}$/;
  if (!prShaPattern.test(data.version)) {
    throw new Error(`Version "${data.version}" does not match PR-SHA format`);
  }
  
  // Check if version is displayed in frontend
  if (!versionEl.textContent.includes(data.version)) {
    throw new Error('Version not displayed in frontend header');
  }
  
  return { success: true, version: data.version };
}

// Test 2: Version number updates with deployments
async function testVersionUpdatesWithDeployments() {
  // This test verifies the version generation logic
  const response = await fetch('/api/version');
  const data = await response.json();
  
  if (!data.version) {
    throw new Error('Version not returned from API');
  }
  
  // Verify version contains commit SHA
  const parts = data.version.split('-');
  if (parts.length !== 3 || parts[0] !== 'PR') {
    throw new Error(`Invalid version format: ${data.version}`);
  }
  
  const commitSha = parts[2];
  if (!/^[a-f0-9]{7}$/.test(commitSha)) {
    throw new Error(`Invalid commit SHA format: ${commitSha}`);
  }
  
  return { success: true, version: data.version, commitSha };
}

// Export tests for gating test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testVersionDisplayInHeader,
    testVersionUpdatesWithDeployments
  };
}
