#!/usr/bin/env node
/**
 * GitHub PR Service - Fetch PRs directly from GitHub API
 * No storage, no sync, single source of truth
 */

import { Octokit } from '@octokit/rest';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'demian7575';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'aipm';

const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

export class GitHubPRService {
  /**
   * Get all PRs for the repository
   */
  async getAllPRs(state = 'all') {
    try {
      const { data } = await octokit.pulls.list({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        state,
        per_page: 100
      });
      
      return data.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.html_url,
        author: pr.user.login,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at,
        branch: pr.head.ref,
        base: pr.base.ref
      }));
    } catch (error) {
      console.error('Error fetching PRs from GitHub:', error.message);
      return [];
    }
  }

  /**
   * Get a specific PR by number
   */
  async getPR(prNumber) {
    try {
      const { data } = await octokit.pulls.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: prNumber
      });
      
      return {
        number: data.number,
        title: data.title,
        state: data.state,
        url: data.html_url,
        author: data.user.login,
        created_at: data.created_at,
        updated_at: data.updated_at,
        merged_at: data.merged_at,
        branch: data.head.ref,
        base: data.base.ref,
        body: data.body
      };
    } catch (error) {
      console.error(`Error fetching PR #${prNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Get PRs associated with a story (by searching PR titles/body)
   */
  async getPRsForStory(storyId) {
    const allPRs = await this.getAllPRs();
    
    // Filter PRs that mention the story ID in title or body
    return allPRs.filter(pr => 
      pr.title.includes(`#${storyId}`) || 
      pr.title.includes(`story-${storyId}`)
    );
  }
}

export default new GitHubPRService();
