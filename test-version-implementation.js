/**
 * Integration test for development environment version numbering
 */

import { spawn } from 'child_process';
import { execSync } from 'child_process';

async function testVersionImplementation() {
  console.log('🧪 Testing development environment version numbering implementation...');
  
  // Get current commit SHA
  const commitSha = execSync('git log --format="%H" -n 1', { encoding: 'utf8' }).trim().substring(0, 6);
  const prNumber = '988';
  
  console.log(`Expected version format: version-${prNumber}-${commitSha}`);
  
  // Start server with development environment variables
  const server = spawn('node', ['apps/backend/server.js'], {
    env: {
      ...process.env,
      STAGE: 'dev',
      PR_NUMBER: prNumber,
      COMMIT_SHA: commitSha
    },
    stdio: 'pipe'
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    // Test version endpoint
    const response = await fetch('http://localhost:4000/api/version');
    const data = await response.json();
    
    console.log('Actual version from API:', data.version);
    
    const expectedVersion = `version-${prNumber}-${commitSha}`;
    
    if (data.version === expectedVersion) {
      console.log('✅ Version format test PASSED');
      console.log('✅ Version display test PASSED (API returns correct format)');
      return true;
    } else {
      console.log('❌ Version format test FAILED');
      console.log(`Expected: ${expectedVersion}`);
      console.log(`Actual: ${data.version}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    // Clean up server
    server.kill();
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  testVersionImplementation().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}

export { testVersionImplementation };
