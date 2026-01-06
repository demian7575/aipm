/**
 * Version number generator for development environments
 * Generates version identifiers using PR number and commit SHA format
 */

/**
 * Generate version number from PR number and commit SHA
 * @param {number|string} prNumber - Pull request number
 * @param {string} commitSha - Full commit SHA
 * @returns {string} Version string in format PR-{number}-{short-sha}
 */
export function generateVersionNumber(prNumber, commitSha) {
  if (!prNumber || !commitSha) {
    throw new Error('PR number and commit SHA are required');
  }
  
  const shortSha = commitSha.substring(0, 7);
  return `PR-${prNumber}-${shortSha}`;
}

/**
 * Get version number from environment variables
 * @returns {string} Version string or fallback
 */
export function getVersionFromEnvironment() {
  const prNumber = process.env.GITHUB_PR_NUMBER || process.env.PR_NUMBER;
  const commitSha = process.env.GITHUB_SHA || process.env.COMMIT_SHA;
  
  if (prNumber && commitSha) {
    return generateVersionNumber(prNumber, commitSha);
  }
  
  // Fallback for local development
  const timestamp = Date.now();
  return `DEV-${timestamp}`;
}

/**
 * Add version to deployment metadata
 * @param {Object} deploymentConfig - Deployment configuration
 * @returns {Object} Updated configuration with version
 */
export function addVersionToDeployment(deploymentConfig) {
  const version = getVersionFromEnvironment();
  
  return {
    ...deploymentConfig,
    version,
    versionedAt: new Date().toISOString()
  };
}
