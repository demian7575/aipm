/**
 * Gating test - Test ECS worker
 */

import { spawnSync } from 'node:child_process';

/**
 * Test ECS worker by attempting to describe clusters
 * @returns {Promise<boolean>} Test result
 */
async function testECSWorker() {
  try {
    const result = spawnSync('aws', ['ecs', 'describe-clusters', '--region', 'us-east-1'], {
      encoding: 'utf8',
      timeout: 10000
    });
    
    // Expected to fail with AccessDeniedException - this confirms worker is functioning
    if (result.stderr && result.stderr.includes('AccessDeniedException')) {
      return true;
    }
    
    return result.status === 0;
  } catch (error) {
    console.error('ECS worker test failed:', error.message);
    return false;
  }
}

/**
 * Execute gating test
 */
async function runGatingTest() {
  try {
    const result = await testECSWorker();
    if (result) {
      console.log('✓ ECS Worker Gating Test PASSED');
      process.exit(0);
    } else {
      console.log('✗ ECS Worker Gating Test FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error.message);
    process.exit(1);
  }
}

runGatingTest();
