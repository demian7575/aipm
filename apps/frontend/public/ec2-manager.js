/**
 * EC2 Auto-Start/Stop Integration
 * Handles dynamic IP updates and EC2 lifecycle management
 */

const EC2_CONFIG = {
  prod: 'https://aipm-ec2-config.s3.amazonaws.com/prod-config.json',
  dev: 'https://aipm-ec2-config.s3.amazonaws.com/dev-config.json'
};

const EC2_CONTROL_API = 'https://nger6kll11.execute-api.us-east-1.amazonaws.com';

let cachedConfig = {};
let lastFetchTime = {};
const CACHE_DURATION = 60000; // 1 minute

/**
 * Get current EC2 config from S3
 * @param {string} env - 'prod' or 'dev'
 * @returns {Promise<object>} Config with apiBaseUrl, semanticApiUrl, status
 */
async function getEC2Config(env = 'prod') {
  const now = Date.now();
  
  // Return cached config if still valid
  if (cachedConfig[env] && (now - (lastFetchTime[env] || 0)) < CACHE_DURATION) {
    return cachedConfig[env];
  }
  
  try {
    const response = await fetch(EC2_CONFIG[env]);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const config = await response.json();
    cachedConfig[env] = config;
    lastFetchTime[env] = now;
    
    console.log(`[EC2] ${env} config loaded:`, config);
    return config;
  } catch (error) {
    console.error(`[EC2] Failed to load ${env} config:`, error);
    
    // Return cached if available
    if (cachedConfig[env]) {
      console.warn(`[EC2] Using cached ${env} config`);
      return cachedConfig[env];
    }
    
    throw error;
  }
}

/**
 * Get EC2 instance status
 * @param {string} env - 'prod' or 'dev'
 * @returns {Promise<object>} {state, publicIp, instanceId}
 */
async function getEC2Status(env = 'prod') {
  try {
    const response = await fetch(`${EC2_CONTROL_API}?action=status&env=${env}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[EC2] Failed to get ${env} status:`, error);
    throw error;
  }
}

/**
 * Start EC2 instance
 * @param {string} env - 'prod' or 'dev'
 * @returns {Promise<object>} {message, state}
 */
async function startEC2(env = 'prod') {
  try {
    console.log(`[EC2] Starting ${env} instance...`);
    const response = await fetch(`${EC2_CONTROL_API}?action=start&env=${env}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    console.log(`[EC2] ${env} start result:`, result);
    
    // Clear cached config to force refresh
    delete cachedConfig[env];
    delete lastFetchTime[env];
    
    return result;
  } catch (error) {
    console.error(`[EC2] Failed to start ${env}:`, error);
    throw error;
  }
}

/**
 * Stop EC2 instance
 * @param {string} env - 'prod' or 'dev'
 * @returns {Promise<object>} {message, state}
 */
async function stopEC2(env = 'prod') {
  try {
    console.log(`[EC2] Stopping ${env} instance...`);
    const response = await fetch(`${EC2_CONTROL_API}?action=stop&env=${env}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    console.log(`[EC2] ${env} stop result:`, result);
    return result;
  } catch (error) {
    console.error(`[EC2] Failed to stop ${env}:`, error);
    throw error;
  }
}

/**
 * Wait for EC2 to be running and config updated
 * @param {string} env - 'prod' or 'dev'
 * @param {number} maxWaitMs - Maximum wait time in milliseconds
 * @returns {Promise<object>} Config when ready
 */
async function waitForEC2Ready(env = 'prod', maxWaitMs = 120000) {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const status = await getEC2Status(env);
      console.log(`[EC2] ${env} status:`, status.state);
      
      if (status.state === 'running' && status.publicIp) {
        // Wait a bit more for services to start
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Get updated config
        delete cachedConfig[env];
        delete lastFetchTime[env];
        const config = await getEC2Config(env);
        
        console.log(`[EC2] ${env} is ready!`);
        return config;
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.warn(`[EC2] Polling error:`, error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  throw new Error(`Timeout waiting for ${env} EC2 to be ready`);
}

/**
 * Ensure EC2 is running, start if needed
 * @param {string} env - 'prod' or 'dev'
 * @returns {Promise<object>} Config when ready
 */
async function ensureEC2Running(env = 'prod') {
  try {
    const status = await getEC2Status(env);
    
    if (status.state === 'running') {
      console.log(`[EC2] ${env} is already running`);
      return await getEC2Config(env);
    }
    
    if (status.state === 'stopped') {
      console.log(`[EC2] ${env} is stopped, starting...`);
      await startEC2(env);
      return await waitForEC2Ready(env);
    }
    
    if (status.state === 'stopping' || status.state === 'starting') {
      console.log(`[EC2] ${env} is ${status.state}, waiting...`);
      return await waitForEC2Ready(env);
    }
    
    throw new Error(`Unexpected EC2 state: ${status.state}`);
  } catch (error) {
    console.error(`[EC2] Failed to ensure ${env} running:`, error);
    throw error;
  }
}

// Export functions
window.EC2Manager = {
  getConfig: getEC2Config,
  getStatus: getEC2Status,
  start: startEC2,
  stop: stopEC2,
  waitForReady: waitForEC2Ready,
  ensureRunning: ensureEC2Running
};
