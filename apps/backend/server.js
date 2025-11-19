import { createApp } from './app.js';

// PR creation functions for automatic GitHub integration
export async function handlePersonalDelegateRequest(req, res, url) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        
        // GitHub API configuration
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.GITHUB_OWNER || payload.owner || 'demian7575';
        const REPO_NAME = process.env.GITHUB_REPO || payload.repo || 'aipm';
        
        if (!GITHUB_TOKEN) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ 
            error: 'GitHub token not configured. Set GITHUB_TOKEN environment variable.' 
          }));
          return;
        }

        // Create branch and PR using GitHub API
        const result = await createGitHubPR({
          token: GITHUB_TOKEN,
          owner: REPO_OWNER,
          repo: REPO_NAME,
          branchName: payload.branchName,
          prTitle: payload.prTitle,
          prBody: buildPRBody(payload),
          storyId: payload.storyId
        });
        
        if (result.success) {
          // Return response in the format expected by the frontend
          const response = {
            type: 'pull_request',
            id: result.prNumber,
            html_url: result.prUrl,
            number: result.prNumber,
            taskHtmlUrl: result.prUrl,
            threadHtmlUrl: result.prUrl,
            confirmationCode: Math.random().toString(36).substring(2, 8).toUpperCase()
          };
          
          res.writeHead(201, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(response));
        } else {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: result.error }));
        }
      } catch (error) {
        console.error('PR creation error:', error);
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Invalid JSON or request failed' }));
      }
    });
  } catch (error) {
    console.error('PR creation handler error:', error);
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

function buildPRBody(payload) {
  return `
## Story Implementation

**Story ID:** ${payload.storyId || 'N/A'}
**Title:** ${payload.storyTitle || 'Untitled'}

### Objective
${payload.objective || 'Implement the user story requirements'}

### Acceptance Criteria
${Array.isArray(payload.acceptanceCriteria) 
  ? payload.acceptanceCriteria.map(criterion => `- ${criterion}`).join('\n')
  : payload.acceptanceCriteria || 'No acceptance criteria specified'}

### Constraints
${payload.constraints || 'Follow standard development practices'}

### Branch
\`${payload.branchName}\`

---
*Auto-generated PR from AIPM*
`;
}

async function createGitHubPR({ token, owner, repo, branchName, prTitle, prBody, storyId }) {
  const baseUrl = 'https://api.github.com';
  
  try {
    // Get the default branch (usually main or master)
    const repoResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!repoResponse.ok) {
      throw new Error(`Failed to get repository info: ${repoResponse.statusText}`);
    }
    
    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch;
    
    // Get the latest commit SHA from the default branch
    const branchResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!branchResponse.ok) {
      throw new Error(`Failed to get branch info: ${branchResponse.statusText}`);
    }
    
    const branchData = await branchResponse.json();
    const baseSha = branchData.object.sha;
    
    // Create new branch
    const createBranchResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha
      })
    });
    
    if (!createBranchResponse.ok) {
      const errorText = await createBranchResponse.text();
      throw new Error(`Failed to create branch: ${createBranchResponse.statusText} - ${errorText}`);
    }
    
    // Create a placeholder file to make the branch have content
    const placeholderContent = `# Story ${storyId} Implementation

This branch was created automatically for implementing story ${storyId}.

## Next Steps
1. Implement the required functionality
2. Add tests
3. Update documentation
4. Request review

## Story Details
${prBody}
`;
    
    const createFileResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}/contents/story-${storyId}-implementation.md`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add implementation placeholder for story ${storyId}`,
        content: Buffer.from(placeholderContent).toString('base64'),
        branch: branchName
      })
    });
    
    if (!createFileResponse.ok) {
      const errorText = await createFileResponse.text();
      console.warn(`Failed to create placeholder file: ${createFileResponse.statusText} - ${errorText}`);
      // Continue anyway, as this is not critical
    }
    
    // Create pull request
    const createPRResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: prTitle,
        body: prBody,
        head: branchName,
        base: defaultBranch
      })
    });
    
    if (!createPRResponse.ok) {
      const errorText = await createPRResponse.text();
      throw new Error(`Failed to create PR: ${createPRResponse.statusText} - ${errorText}`);
    }
    
    const prData = await createPRResponse.json();
    
    return {
      success: true,
      prNumber: prData.number,
      prUrl: prData.html_url,
      branchName: branchName,
      message: `PR #${prData.number} created successfully`
    };
    
  } catch (error) {
    console.error('GitHub API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function handlePersonalDelegateStatusRequest(req, res, url) {
  // Mock status response for PR
  const mockStatus = {
    fetchedAt: new Date().toISOString(),
    totalComments: 1,
    latestComment: {
      id: 400,
      body: 'PR created and ready for development',
      html_url: 'https://github.com/comment/400',
      created_at: new Date().toISOString(),
      author: 'github-actions',
      links: [],
      snippet: 'PR created and ready for development'
    }
  };
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(mockStatus));
}

const desiredPort = Number(process.env.PORT || 4000);
const allowDynamicFallback = !process.env.PORT;

createApp()
  .then((server) => {
    const listen = (portToUse, allowFallback) => {
      const handleListening = () => {
        server.off('error', handleError);
        const address = server.address();
        const resolvedPort =
          typeof address === 'object' && address !== null ? address.port : portToUse;
        console.log(`Server running on http://localhost:${resolvedPort}`);
      };

      const handleError = (error) => {
        server.off('listening', handleListening);
        if (error && error.code === 'EADDRINUSE' && allowFallback) {
          console.warn(
            `Port ${portToUse} is already in use. Trying a random available port instead.`,
          );
          setImmediate(() => listen(0, false));
          return;
        }

        console.error('Failed to start server', error);
        process.exit(1);
      };

      server.once('listening', handleListening);
      server.once('error', handleError);
      server.listen(portToUse);
    };

    listen(desiredPort, allowDynamicFallback);
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
