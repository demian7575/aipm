#!/usr/bin/env node

/**
 * Test suite for Automatic Version Numbering System
 */

import assert from 'assert';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the version generator functions
import {
    generateVersion,
    getCurrentCommitSha,
    getPrNumber,
    updateConfigFiles
} from '../version-generator.js';

/**
 * Test: Version format generation
 * Given: a PR number and commit SHA are available
 * When: the version numbering system is triggered
 * Then: a version identifier is generated in PR-SHA format
 */
function testVersionFormatGeneration() {
    console.log('🧪 Testing version format generation...');
    
    // Test with valid inputs
    const version1 = generateVersion(123, 'abc1234');
    assert.strictEqual(version1, 'PR123-abc1234', 'Version format should be PR{number}-{sha}');
    
    const version2 = generateVersion('456', 'def5678');
    assert.strictEqual(version2, 'PR456-def5678', 'Version should handle string PR numbers');
    
    // Test error cases
    try {
        generateVersion(null, 'abc1234');
        assert.fail('Should throw error for null PR number');
    } catch (error) {
        assert(error.message.includes('required'), 'Should require PR number');
    }
    
    try {
        generateVersion(123, null);
        assert.fail('Should throw error for null commit SHA');
    } catch (error) {
        assert(error.message.includes('required'), 'Should require commit SHA');
    }
    
    console.log('✅ Version format generation test passed');
}

/**
 * Test: Development deployment versioning
 * Given: a development deployment is initiated
 * When: the automatic versioning system runs
 * Then: the deployment is tagged with the generated version identifier
 */
function testDevelopmentDeploymentVersioning() {
    console.log('🧪 Testing development deployment versioning...');
    
    // Create temporary config file for testing
    const testConfigPath = './test-config.js';
    const testConfig = `
// Test configuration
window.CONFIG = {
  API_BASE_URL: 'http://localhost',
  VERSION: 'old-version',
  COMMIT_HASH: 'old-hash'
};`;
    
    fs.writeFileSync(testConfigPath, testConfig);
    
    try {
        // Test config file update
        updateConfigFiles('PR123-abc1234', 'abc1234');
        
        // Check if the test config was updated (it shouldn't be since it's not in the expected paths)
        const updatedContent = fs.readFileSync(testConfigPath, 'utf8');
        assert(updatedContent.includes('old-version'), 'Test config should not be modified');
        
        // Test with actual config file path
        const devConfigPath = './apps/frontend/public/config-dev.js';
        if (fs.existsSync(devConfigPath)) {
            const originalContent = fs.readFileSync(devConfigPath, 'utf8');
            
            // Update with test version
            updateConfigFiles('PR999-test123', 'test123');
            
            const updatedContent = fs.readFileSync(devConfigPath, 'utf8');
            assert(updatedContent.includes('PR999-test123'), 'Config should contain new version');
            assert(updatedContent.includes('test123'), 'Config should contain new commit hash');
            
            // Restore original content
            fs.writeFileSync(devConfigPath, originalContent);
        }
        
        console.log('✅ Development deployment versioning test passed');
    } finally {
        // Clean up test file
        if (fs.existsSync(testConfigPath)) {
            fs.unlinkSync(testConfigPath);
        }
    }
}

/**
 * Test: getCurrentCommitSha function
 */
function testGetCurrentCommitSha() {
    console.log('🧪 Testing getCurrentCommitSha...');
    
    const sha = getCurrentCommitSha();
    assert(typeof sha === 'string', 'Should return a string');
    assert(sha.length >= 7, 'Should return at least 7 characters');
    assert(/^[a-f0-9]+$/.test(sha), 'Should contain only hex characters');
    
    console.log('✅ getCurrentCommitSha test passed');
}

/**
 * Test: getPrNumber function
 */
function testGetPrNumber() {
    console.log('🧪 Testing getPrNumber...');
    
    // Test with environment variable
    const originalPrNumber = process.env.PR_NUMBER;
    process.env.PR_NUMBER = '123';
    
    const prNumber = getPrNumber();
    assert.strictEqual(prNumber, 123, 'Should return PR number from environment');
    
    // Restore original environment
    if (originalPrNumber) {
        process.env.PR_NUMBER = originalPrNumber;
    } else {
        delete process.env.PR_NUMBER;
    }
    
    console.log('✅ getPrNumber test passed');
}

/**
 * Run all tests
 */
function runTests() {
    console.log('🚀 Running Automatic Version Numbering System tests...\n');
    
    try {
        testVersionFormatGeneration();
        testDevelopmentDeploymentVersioning();
        testGetCurrentCommitSha();
        testGetPrNumber();
        
        console.log('\n🎉 All tests passed! Automatic Version Numbering System is working correctly.');
        return true;
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const success = runTests();
    process.exit(success ? 0 : 1);
}

export { runTests };
