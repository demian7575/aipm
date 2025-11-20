import { createApp } from './app.js';

// Mock delegation functions for CodeWhisperer integration
export async function handlePersonalDelegateRequest(req, res, url) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        
        console.log('Delegation payload received:', {
          target: payload.target,
          owner: payload.owner,
          repo: payload.repo,
          branchName: payload.branchName,
          prTitle: payload.prTitle
        });
        
        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: 'GitHub token not configured' }));
          return;
        }
        
        const owner = payload.owner || 'demian7575';
        const repo = payload.repo || 'aipm';
        const branchName = payload.branchName || `codewhisperer-${Date.now()}`;
        const prTitle = payload.prTitle || payload.taskTitle || 'CodeWhisperer Task';
        
        // Create PR body from delegation details
        const prBody = `# CodeWhisperer Delegation

**Task**: ${payload.taskTitle || 'Development Task'}
**Objective**: ${payload.objective || 'Not specified'}

## Constraints
${payload.constraints || 'None specified'}

## Acceptance Criteria
${payload.acceptanceCriteria || 'To be defined'}

---
*This PR was created via CodeWhisperer delegation*`;

        try {
          // Create branch from main
          const mainResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`, {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'AIPM-Bot'
            }
          });
          
          if (!mainResponse.ok) {
            throw new Error(`Failed to get main branch: ${mainResponse.statusText}`);
          }
          
          const mainBranch = await mainResponse.json();
          
          // Create new branch
          const createBranchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'AIPM-Bot',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ref: `refs/heads/${branchName}`,
              sha: mainBranch.object.sha
            })
          });
          
          if (!createBranchResponse.ok) {
            const error = await createBranchResponse.text();
            throw new Error(`Failed to create branch: ${error}`);
          }
          
          // Create placeholder file
          const fileName = `codewhisperer-task-${Date.now()}.md`;
          const fileContent = `# ${prTitle}

${prBody}
`;
          
          await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`, {
            method: 'PUT',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'AIPM-Bot',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `Add CodeWhisperer task: ${prTitle}`,
              content: Buffer.from(fileContent).toString('base64'),
              branch: branchName
            })
          });
          
          // Create PR
          const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'AIPM-Bot',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: prTitle,
              body: prBody,
              head: branchName,
              base: 'main'
            })
          });
          
          if (!prResponse.ok) {
            const errorData = await prResponse.json();
            throw new Error(`Failed to create PR: ${errorData.message}`);
          }
          
          const pr = await prResponse.json();
          
          res.writeHead(201, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({
            type: 'pull_request',
            id: pr.id,
            number: pr.number,
            html_url: pr.html_url,
            taskHtmlUrl: pr.html_url,
            branchName: branchName,
            confirmationCode: `PR${pr.number}`
          }));
          
        } catch (githubError) {
          console.error('GitHub API error:', githubError);
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: `GitHub API error: ${githubError.message}` }));
        }
        
      } catch (error) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } catch (error) {
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

export async function handlePersonalDelegateStatusRequest(req, res, url) {
  // Mock status response
  const mockStatus = {
    fetchedAt: new Date().toISOString(),
    totalComments: 1,
    latestComment: {
      id: 400,
      body: 'Task completed successfully',
      html_url: 'https://github.com/comment/400',
      created_at: new Date().toISOString(),
      author: 'amazon-codewhisperer',
      links: [],
      snippet: 'Task completed successfully'
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
