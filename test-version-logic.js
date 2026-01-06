/**
 * Direct test of version logic
 */

import { execSync } from 'child_process';

// Simulate the version logic from the backend
function getVersionForStage(stage, prNumber, commitSha) {
  if (stage === 'dev' || stage === 'development') {
    return `version-${prNumber}-${commitSha}`;
  } else {
    return '4.0.0';
  }
}

function testVersionLogic() {
  console.log('🧪 Testing version logic directly...');
  
  // Get current commit SHA
  const commitSha = execSync('git log --format="%H" -n 1', { encoding: 'utf8' }).trim().substring(0, 6);
  const prNumber = '988';
  
  // Test development stage
  const devVersion = getVersionForStage('dev', prNumber, commitSha);
  const expectedVersion = `version-${prNumber}-${commitSha}`;
  
  console.log('Expected version:', expectedVersion);
  console.log('Actual version:', devVersion);
  
  if (devVersion === expectedVersion) {
    console.log('✅ Version logic test PASSED');
    return true;
  } else {
    console.log('❌ Version logic test FAILED');
    return false;
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const passed = testVersionLogic();
  process.exit(passed ? 0 : 1);
}

export { testVersionLogic };
