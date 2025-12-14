/**
 * ECS Worker Gating Test
 * @description Tests ECS worker functionality
 */

/**
 * Tests ECS cluster status
 * @returns {Promise<boolean>} Test result
 */
async function testECSCluster() {
  try {
    const response = await fetch('/api/ecs/cluster-status');
    const data = await response.json();
    return response.ok && data.status === 'active';
  } catch (error) {
    console.error('ECS cluster test failed:', error);
    return false;
  }
}

/**
 * Tests ECS worker availability
 * @returns {Promise<boolean>} Test result
 */
async function testECSWorker() {
  try {
    const response = await fetch('/api/ecs/worker-status');
    const data = await response.json();
    return response.ok && data.workers > 0;
  } catch (error) {
    console.error('ECS worker test failed:', error);
    return false;
  }
}

/**
 * Run ECS worker gating test
 * @returns {Promise<boolean>} Test passes
 */
async function runECSWorkerTest() {
  try {
    const clusterTest = await testECSCluster();
    const workerTest = await testECSWorker();
    
    const result = clusterTest && workerTest;
    
    console.log('ECS Cluster Test:', clusterTest ? 'PASS' : 'FAIL');
    console.log('ECS Worker Test:', workerTest ? 'PASS' : 'FAIL');
    console.log('Overall ECS Test:', result ? 'PASS' : 'FAIL');
    
    return result;
  } catch (error) {
    console.error('ECS worker test error:', error);
    return false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runECSWorkerTest };
}
