#!/usr/bin/env node

/**
 * Automatic Version Numbering System
 * Generates version identifiers using PR number and commit SHA format
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Generate version identifier in PR-SHA format
 * @param {number|string} prNumber - Pull request number
 * @param {string} commitSha - Commit SHA (short format)
 * @returns {string} Version identifier in format "PR{number}-{sha}"
 */
function generateVersion(prNumber, commitSha) {
    if (!prNumber || !commitSha) {
        throw new Error('Both PR number and commit SHA are required');
    }
    return `PR${prNumber}-${commitSha}`;
}

/**
 * Get current commit SHA (short format)
 * @returns {string} Short commit SHA
 */
function getCurrentCommitSha() {
    try {
        return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
        throw new Error('Failed to get commit SHA: ' + error.message);
    }
}

/**
 * Extract PR number from branch name or environment
 * @returns {number|null} PR number or null if not found
 */
function getPrNumber() {
    // Try to get from environment variable first
    if (process.env.PR_NUMBER) {
        return parseInt(process.env.PR_NUMBER, 10);
    }
    
    // Try to extract from current branch name
    try {
        const branchName = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        const prMatch = branchName.match(/pr-?(\d+)/i) || branchName.match(/(\d+)$/);
        if (prMatch) {
            return parseInt(prMatch[1], 10);
        }
    } catch (error) {
        // Ignore git errors
    }
    
    return null;
}

/**
 * Update config files with new version
 * @param {string} version - Version identifier
 * @param {string} commitSha - Commit SHA
 */
function updateConfigFiles(version, commitSha) {
    const configFiles = [
        './apps/frontend/public/config-dev.js',
        './apps/frontend/public/config-prod.js'
    ];
    
    configFiles.forEach(configPath => {
        if (fs.existsSync(configPath)) {
            let content = fs.readFileSync(configPath, 'utf8');
            
            // Update version
            content = content.replace(
                /VERSION:\s*['"][^'"]*['"]/,
                `VERSION: '${version}'`
            );
            
            // Update commit hash
            content = content.replace(
                /COMMIT_HASH:\s*['"][^'"]*['"]/,
                `COMMIT_HASH: '${commitSha}'`
            );
            
            fs.writeFileSync(configPath, content);
            console.log(`✅ Updated ${configPath} with version ${version}`);
        }
    });
}

/**
 * Main function - generate and apply version
 */
function main() {
    try {
        const commitSha = getCurrentCommitSha();
        const prNumber = getPrNumber();
        
        if (prNumber) {
            const version = generateVersion(prNumber, commitSha);
            console.log(`🏷️  Generated version: ${version}`);
            
            updateConfigFiles(version, commitSha);
            
            // Output for use in scripts
            console.log(`VERSION=${version}`);
            console.log(`COMMIT_HASH=${commitSha}`);
            
            return { version, commitSha, prNumber };
        } else {
            // Fallback to timestamp-based version for non-PR deployments
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const version = `${timestamp}-${commitSha}`;
            
            console.log(`🏷️  Generated fallback version: ${version}`);
            updateConfigFiles(version, commitSha);
            
            console.log(`VERSION=${version}`);
            console.log(`COMMIT_HASH=${commitSha}`);
            
            return { version, commitSha, prNumber: null };
        }
    } catch (error) {
        console.error('❌ Version generation failed:', error.message);
        process.exit(1);
    }
}

// Export functions for testing
export {
    generateVersion,
    getCurrentCommitSha,
    getPrNumber,
    updateConfigFiles,
    main
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
