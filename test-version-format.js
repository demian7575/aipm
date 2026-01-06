/**
 * Acceptance Test: Version format validation
 * Given: a development environment is deployed from PR #123 with commit abc1234567
 * When: I check the version number
 * Then: it should display as version-123-abc123
 */

import { execSync } from 'child_process';
import http from 'http';

function testVersionFormat() {
  console.log('🧪 Testing version format validation...');
  
  // Mock environment variables for test
  process.env.STAGE = 'dev';
  process.env.PR_NUMBER = '988';
  
  // Get current commit SHA (first 6 characters)
  const commitSha = execSync('git log --format="%H" -n 1', { encoding: 'utf8' }).trim().substring(0, 6);
  process.env.COMMIT_SHA = commitSha;
  
  // Test the version endpoint
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/version',
    method: 'GET'
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const version = JSON.parse(data);
          const expectedFormat = `version-988-${commitSha}`;
          
          console.log('Expected format:', expectedFormat);
          console.log('Actual version:', version.version);
          
          if (version.version === expectedFormat) {
            console.log('✅ Version format test PASSED');
            resolve(true);
          } else {
            console.log('❌ Version format test FAILED');
            resolve(false);
          }
        } catch (e) {
          console.error('❌ Failed to parse version response:', e);
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Version test request failed:', e);
      resolve(false);
    });
    
    req.end();
  });
}

export { testVersionFormat };

if (process.argv[1] === new URL(import.meta.url).pathname) {
  testVersionFormat().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
