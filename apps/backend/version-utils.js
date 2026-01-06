/**
 * Version numbering utility for AIPM deployments
 * Generates version identifiers using PR number and commit SHA format
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/**
 * Generate version number using PR number and commit SHA
 * @param {number} prNumber - Pull request number
 * @param {string} commitSha - Commit SHA (short form)
 * @returns {string} Version identifier in format PR{number}-{sha}
 */
export function generateVersionNumber(prNumber, commitSha) {
  if (!prNumber || !commitSha) {
    throw new Error('PR number and commit SHA are required');
  }
  
  return `PR${prNumber}-${commitSha}`;
}

/**
 * Get current git commit SHA (short form)
 * @returns {string} Short commit SHA
 */
export function getCurrentCommitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('Could not get git commit SHA:', error.message);
    return 'unknown';
  }
}

/**
 * Extract PR number from branch name or environment
 * @param {string} branchName - Git branch name
 * @returns {number|null} PR number if found
 */
export function extractPRNumber(branchName) {
  // Try to extract from GitHub environment variables first
  if (process.env.GITHUB_REF && process.env.GITHUB_REF.includes('pull/')) {
    const match = process.env.GITHUB_REF.match(/pull\/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  // Try to extract from branch name patterns
  if (branchName) {
    // Pattern: feature/PR123-description or PR123-description
    const prMatch = branchName.match(/PR(\d+)/i);
    if (prMatch) {
      return parseInt(prMatch[1], 10);
    }
  }
  
  return null;
}

/**
 * Generate deployment version for current context
 * @param {Object} options - Options for version generation
 * @param {number} options.prNumber - PR number (optional, will try to detect)
 * @param {string} options.commitSha - Commit SHA (optional, will use current)
 * @param {string} options.branchName - Branch name (optional, will use current)
 * @returns {string} Generated version identifier
 */
export function generateDeploymentVersion(options = {}) {
  const commitSha = options.commitSha || getCurrentCommitSha();
  
  let prNumber = options.prNumber;
  if (!prNumber) {
    const branchName = options.branchName || getCurrentBranchName();
    prNumber = extractPRNumber(branchName);
  }
  
  if (prNumber) {
    return generateVersionNumber(prNumber, commitSha);
  }
  
  // Fallback to timestamp-based version for non-PR deployments
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${timestamp}-${commitSha}`;
}

/**
 * Get current git branch name
 * @returns {string} Current branch name
 */
function getCurrentBranchName() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('Could not get git branch name:', error.message);
    return 'unknown';
  }
}

/**
 * Update frontend config with version information
 * @param {string} configPath - Path to config file
 * @param {string} version - Version to set
 */
export function updateFrontendVersion(configPath, version) {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  
  let config = readFileSync(configPath, 'utf8');
  config = config.replace(/VERSION:\s*['"][^'"]*['"]/, `VERSION: '${version}'`);
  config = config.replace(/DEPLOY_TIMESTAMP_PLACEHOLDER/g, version);
  
  writeFileSync(configPath, config);
  console.log(`Updated ${configPath} with version: ${version}`);
}
