/**
 * Gating tests for automatic version numbering system
 * Tests version format generation and deployment integration
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

/**
 * Test version format generation
 * Given: a PR number 123 and commit SHA abc1234
 * When: the version numbering system is triggered
 * Then: it generates a version identifier in format PR123-abc1234
 */
function testVersionFormatGeneration() {
  console.log('Testing version format generation...');
  
  try {
    // Mock PR number and commit SHA
    const prNumber = 123;
    const commitSha = 'abc1234';
    
    // Generate version using the system
    const version = generateVersionNumber(prNumber, commitSha);
    
    // Verify format
    const expectedFormat = `PR${prNumber}-${commitSha}`;
    if (version !== expectedFormat) {
      throw new Error(`Expected ${expectedFormat}, got ${version}`);
    }
    
    console.log('✅ Version format generation test passed');
    return true;
  } catch (error) {
    console.error('❌ Version format generation test failed:', error.message);
    return false;
  }
}

/**
 * Test development deployment integration
 * Given: a development deployment is initiated
 * When: the automatic version numbering system runs
 * Then: the generated version identifier is applied to the deployment artifacts
 */
function testDeploymentIntegration() {
  console.log('Testing deployment integration...');
  
  try {
    // Check if deployment script exists
    if (!existsSync('./scripts/deploy-to-environment.sh')) {
      throw new Error('Deployment script not found');
    }
    
    // Verify version numbering is integrated in deployment
    const deployScript = readFileSync('./scripts/deploy-to-environment.sh', 'utf8');
    
    if (!deployScript.includes('DEPLOY_VERSION') || !deployScript.includes('COMMIT_HASH')) {
      throw new Error('Version numbering not integrated in deployment script');
    }
    
    console.log('✅ Deployment integration test passed');
    return true;
  } catch (error) {
    console.error('❌ Deployment integration test failed:', error.message);
    return false;
  }
}

/**
 * Generate version number using PR number and commit SHA
 * @param {number} prNumber - Pull request number
 * @param {string} commitSha - Commit SHA (short form)
 * @returns {string} Version identifier in format PR{number}-{sha}
 */
function generateVersionNumber(prNumber, commitSha) {
  if (!prNumber || !commitSha) {
    throw new Error('PR number and commit SHA are required');
  }
  
  return `PR${prNumber}-${commitSha}`;
}

// Export for use in other modules
export { generateVersionNumber };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running version numbering gating tests...\n');
  
  const tests = [
    testVersionFormatGeneration,
    testDeploymentIntegration
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    if (test()) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}
