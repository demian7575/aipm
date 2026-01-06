/**
 * Enhanced gating tests for automatic version numbering system
 * Tests version format generation, deployment integration, and API endpoints
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { generateVersionNumber, generateDeploymentVersion, extractPRNumber } from './apps/backend/version-utils.js';

/**
 * Test version format generation with various inputs
 */
function testVersionFormatGeneration() {
  console.log('Testing version format generation...');
  
  try {
    // Test basic format
    const version1 = generateVersionNumber(123, 'abc1234');
    if (version1 !== 'PR123-abc1234') {
      throw new Error(`Expected PR123-abc1234, got ${version1}`);
    }
    
    // Test with different inputs
    const version2 = generateVersionNumber(456, 'def5678');
    if (version2 !== 'PR456-def5678') {
      throw new Error(`Expected PR456-def5678, got ${version2}`);
    }
    
    // Test error handling
    try {
      generateVersionNumber(null, 'abc1234');
      throw new Error('Should have thrown error for null PR number');
    } catch (error) {
      if (!error.message.includes('required')) {
        throw error;
      }
    }
    
    console.log('✅ Version format generation test passed');
    return true;
  } catch (error) {
    console.error('❌ Version format generation test failed:', error.message);
    return false;
  }
}

/**
 * Test PR number extraction from branch names
 */
function testPRNumberExtraction() {
  console.log('Testing PR number extraction...');
  
  try {
    // Test GitHub environment variable
    const originalRef = process.env.GITHUB_REF;
    process.env.GITHUB_REF = 'refs/pull/123/merge';
    
    const prNumber1 = extractPRNumber('some-branch');
    if (prNumber1 !== 123) {
      throw new Error(`Expected 123, got ${prNumber1}`);
    }
    
    // Restore original value
    if (originalRef) {
      process.env.GITHUB_REF = originalRef;
    } else {
      delete process.env.GITHUB_REF;
    }
    
    // Test branch name patterns
    const prNumber2 = extractPRNumber('PR456-feature-branch');
    if (prNumber2 !== 456) {
      throw new Error(`Expected 456, got ${prNumber2}`);
    }
    
    // Test no PR number found
    const prNumber3 = extractPRNumber('main');
    if (prNumber3 !== null) {
      throw new Error(`Expected null, got ${prNumber3}`);
    }
    
    console.log('✅ PR number extraction test passed');
    return true;
  } catch (error) {
    console.error('❌ PR number extraction test failed:', error.message);
    return false;
  }
}

/**
 * Test deployment version generation
 */
function testDeploymentVersionGeneration() {
  console.log('Testing deployment version generation...');
  
  try {
    // Test with PR number
    const version1 = generateDeploymentVersion({
      prNumber: 123,
      commitSha: 'abc1234'
    });
    if (version1 !== 'PR123-abc1234') {
      throw new Error(`Expected PR123-abc1234, got ${version1}`);
    }
    
    // Test without PR number (should use timestamp format)
    const version2 = generateDeploymentVersion({
      commitSha: 'def5678'
    });
    if (!version2.includes('def5678')) {
      throw new Error(`Version should contain commit SHA: ${version2}`);
    }
    
    console.log('✅ Deployment version generation test passed');
    return true;
  } catch (error) {
    console.error('❌ Deployment version generation test failed:', error.message);
    return false;
  }
}

/**
 * Test deployment script integration
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
    
    // Check for PR-based version generation
    if (!deployScript.includes('GITHUB_REF') || !deployScript.includes('PR_NUMBER')) {
      throw new Error('PR-based version generation not integrated');
    }
    
    console.log('✅ Deployment integration test passed');
    return true;
  } catch (error) {
    console.error('❌ Deployment integration test failed:', error.message);
    return false;
  }
}

/**
 * Test backend API integration
 */
function testBackendAPIIntegration() {
  console.log('Testing backend API integration...');
  
  try {
    // Check if backend app.js exists
    if (!existsSync('./apps/backend/app.js')) {
      throw new Error('Backend app.js not found');
    }
    
    // Verify version utils import
    const backendCode = readFileSync('./apps/backend/app.js', 'utf8');
    
    if (!backendCode.includes('version-utils.js')) {
      throw new Error('Version utils not imported in backend');
    }
    
    // Check for version API endpoint updates
    if (!backendCode.includes('generateDeploymentVersion')) {
      throw new Error('Version API endpoint not updated to use automatic versioning');
    }
    
    // Check health endpoint updates
    if (!backendCode.includes('/health') && !backendCode.includes('generateDeploymentVersion')) {
      throw new Error('Health endpoint not updated with version numbering');
    }
    
    console.log('✅ Backend API integration test passed');
    return true;
  } catch (error) {
    console.error('❌ Backend API integration test failed:', error.message);
    return false;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running enhanced version numbering gating tests...\n');
  
  const tests = [
    testVersionFormatGeneration,
    testPRNumberExtraction,
    testDeploymentVersionGeneration,
    testDeploymentIntegration,
    testBackendAPIIntegration
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    if (test()) {
      passed++;
    } else {
      failed++;
    }
    console.log(''); // Add spacing between tests
  }
  
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
  
  console.log('🎉 All version numbering tests passed!');
}
