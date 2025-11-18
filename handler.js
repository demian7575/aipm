import fs from 'fs';
import path from 'path';

// S3-based persistent storage
const S3_BUCKET = `${process.env.AWS_LAMBDA_FUNCTION_NAME || 'aipm'}-data`;
const S3_REGION = process.env.AWS_REGION || 'us-east-1';

// Simple S3 operations using fetch
async function s3Get(key) {
  try {
    const response = await fetch(`https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.warn(`S3 GET ${key} failed:`, error.message);
    return null;
  }
}

async function s3Put(key, data) {
  try {
    const response = await fetch(`https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.ok;
  } catch (error) {
    console.warn(`S3 PUT ${key} failed:`, error.message);
    return false;
  }
}

// Persistent data storage
let stories = [];
let acceptanceTests = [];
let dataLoaded = false;

// Load data from S3
async function loadData() {
  if (dataLoaded) return;
  
  try {
    // Load stories
    const storiesData = await s3Get('stories.json');
    if (storiesData && Array.isArray(storiesData)) {
      stories = storiesData;
    } else {
      // Initialize with seed data
      const timestamp = new Date().toISOString();
      stories = [
        {
          id: 1,
          parentId: null,
          title: 'Root',
          description: 'Seeds the workspace with an AI Project Manager baseline story focused on AIPM component coverage.',
          asA: 'AI project manager',
          iWant: 'coordinate autonomous planning across AIPM components',
          soThat: 'teams can deliver measurable outcomes with shared context',
          components: ['WorkModel', 'Orchestration_Engagement'],
          storyPoint: 5,
          assigneeEmail: 'owner@example.com',
          status: 'Ready',
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ];
      await saveStories();
    }
    
    // Load acceptance tests
    const testsData = await s3Get('acceptance-tests.json');
    if (testsData && Array.isArray(testsData)) {
      acceptanceTests = testsData;
    } else {
      acceptanceTests = [];
      await saveAcceptanceTests();
    }
    
    dataLoaded = true;
    console.log(`Loaded ${stories.length} stories and ${acceptanceTests.length} acceptance tests`);
  } catch (error) {
    console.error('Failed to load data from S3:', error);
    // Continue with empty data
    dataLoaded = true;
  }
}

// Save stories to S3
async function saveStories() {
  try {
    await s3Put('stories.json', stories);
  } catch (error) {
    console.error('Failed to save stories:', error);
  }
}

// Save acceptance tests to S3
async function saveAcceptanceTests() {
  try {
    await s3Put('acceptance-tests.json', acceptanceTests);
  } catch (error) {
    console.error('Failed to save acceptance tests:', error);
  }
}

// Helper function to attach children to stories
function attachChildren(storiesArray) {
function attachChildren(storiesArray) {
  const byId = new Map();
  storiesArray.forEach((story) => {
    story.children = [];
    byId.set(story.id, story);
  });
  
  const roots = [];
  storiesArray.forEach((story) => {
    if (story.parentId && byId.has(story.parentId)) {
      byId.get(story.parentId).children.push(story);
    } else {
      roots.push(story);
    }
  });
  
  return { roots, byId };
}

// Main Lambda handler
export const handler = async (event, context) => {
  try {
    console.log('AIPM Lambda handler called:', JSON.stringify(event, null, 2));
    
    // Initialize data
    initializeData();
    
    // Set up environment for Lambda
    process.env.AIPM_DATA_DIR = '/tmp/aipm/data';
    process.env.AIPM_UPLOAD_DIR = '/tmp/aipm/uploads';
    process.env.NODE_ENV = 'production';
    
    // Parse the request
    const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const requestPath = event.path || event.rawPath || '/';
    
    console.log(`Processing ${httpMethod} ${requestPath}`);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }
    
    // API Routes
    if (requestPath === '/' || requestPath === '/prod' || requestPath === '/prod/') {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'AIPM API Server',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          endpoints: {
            health: '/health',
            stories: '/api/stories',
            story: '/api/stories/:id'
          }
        })
      };
    }
    
    if (requestPath === '/health' || requestPath === '/api/health') {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: 'lambda',
          version: '1.0.0',
          storiesCount: stories.length
        })
      };
    }
    
    if (requestPath === '/api/stories' && httpMethod === 'GET') {
      // Attach acceptance tests to stories
      const storiesWithTests = stories.map(story => ({
        ...story,
        acceptanceTests: acceptanceTests.filter(test => test.storyId === story.id)
      }));
      
      const { roots } = attachChildren([...storiesWithTests]);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(roots)
      };
    }
    
    // Handle individual story requests
    const storyMatch = requestPath.match(/^\/api\/stories\/(\d+)$/);
    if (storyMatch && httpMethod === 'GET') {
      const storyId = parseInt(storyMatch[1]);
      const story = stories.find(s => s.id === storyId);
      
      if (!story) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Story not found',
            message: `Story with id ${storyId} not found`
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Handle story draft generation
    if (requestPath === '/api/stories/draft' && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { idea, parentId } = body;
      
      // Simple draft generation based on the idea
      const draft = {
        title: idea || 'New Story',
        description: `Generated story based on: ${idea || 'user input'}`,
        asA: 'user',
        iWant: idea || 'accomplish a task',
        soThat: 'I can achieve my goals',
        components: [],
        storyPoint: 3
      };
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      };
    }
    
    // Handle story creation
    if (requestPath === '/api/stories' && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const timestamp = new Date().toISOString();
      const newId = Math.max(...stories.map(s => s.id), 0) + 1;
      
      const newStory = {
        id: newId,
        parentId: body.parentId || null,
        title: body.title || 'New Story',
        description: body.description || '',
        asA: body.asA || '',
        iWant: body.iWant || '',
        soThat: body.soThat || '',
        components: body.components || [],
        storyPoint: body.storyPoint || 0,
        assigneeEmail: body.assigneeEmail || '',
        status: body.status || 'Draft',
        createdAt: timestamp,
        updatedAt: timestamp,
        children: []
      };
      
      stories.push(newStory);
      
      return {
        statusCode: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: newStory,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Handle acceptance test update
    const testUpdateMatch = requestPath.match(/^\/api\/tests\/(\d+)$/);
    if (testUpdateMatch && httpMethod === 'PATCH') {
      const testId = parseInt(testUpdateMatch[1]);
      const body = JSON.parse(event.body || '{}');
      const timestamp = new Date().toISOString();
      
      // Find and update the test
      const testIndex = acceptanceTests.findIndex(test => test.id === testId);
      if (testIndex === -1) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Test not found',
            message: `Acceptance test with id ${testId} not found`
          })
        };
      }
      
      // Update the test
      const updatedTest = {
        ...acceptanceTests[testIndex],
        title: body.title || acceptanceTests[testIndex].title,
        given: body.given || acceptanceTests[testIndex].given,
        when: body.when || acceptanceTests[testIndex].when,
        then: body.then || acceptanceTests[testIndex].then,
        status: body.status || acceptanceTests[testIndex].status,
        updatedAt: timestamp
      };
      
      acceptanceTests[testIndex] = updatedTest;
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTest)
      };
    }
    
    // Handle acceptance test creation
    const testCreateMatch = requestPath.match(/^\/api\/stories\/(\d+)\/tests$/);
    if (testCreateMatch && httpMethod === 'POST') {
      const storyId = parseInt(testCreateMatch[1]);
      const body = JSON.parse(event.body || '{}');
      const timestamp = new Date().toISOString();
      
      // Create acceptance test
      const newTest = {
        id: Math.floor(Math.random() * 1000),
        storyId: storyId,
        title: body.title || 'Acceptance Test',
        given: body.given || ['Given the system is ready'],
        when: body.when || ['When the user performs the action'],
        then: body.then || ['Then the expected outcome occurs'],
        status: body.status || 'Draft',
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      // Store the test
      acceptanceTests.push(newTest);
      
      return {
        statusCode: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(newTest)
      };
    }
    
    // Handle acceptance test draft generation
    const testDraftMatch = requestPath.match(/^\/api\/stories\/(\d+)\/tests\/draft$/);
    if (testDraftMatch && httpMethod === 'POST') {
      const storyId = parseInt(testDraftMatch[1]);
      const body = JSON.parse(event.body || '{}');
      
      // Generate a simple acceptance test draft
      const draft = {
        title: body.title || 'Acceptance Test',
        given: body.given || ['Given the system is ready'],
        when: body.when || ['When the user performs the action'],
        then: body.then || ['Then the expected outcome occurs'],
        status: 'Draft'
      };
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      };
    }
    
    // Handle CodeWhisperer delegation
    if (requestPath === '/personal-delegate' && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      try {
        // Try to create real GitHub PR
        const prResponse = await createGitHubPR(body);
        
        const response = {
          type: 'pull_request',
          id: prResponse.id,
          html_url: prResponse.html_url,
          number: prResponse.number,
          taskHtmlUrl: prResponse.html_url,
          confirmationCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          prUrl: prResponse.html_url,
          branch: body.branchName,
          status: prResponse.state || 'open'
        };
        
        return {
          statusCode: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(response)
        };
      } catch (error) {
        console.error('Failed to create GitHub PR:', error);
        
        // Return error details for debugging
        return {
          statusCode: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'PR Creation Failed',
            message: error.message,
            details: 'Check GitHub token and repository permissions',
            timestamp: new Date().toISOString()
          })
        };
      }
    }

// GitHub PR creation function with timeout
async function createGitHubPR(payload) {
  const { owner, repo, branchName, taskTitle, objective, constraints, acceptanceCriteria } = payload;
  
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  
  const headers = {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'AIPM-CodeWhisperer-Bot'
  };
  
  // Helper function to make API calls with timeout
  const fetchWithTimeout = async (url, options, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('GitHub API request timed out');
      }
      throw error;
    }
  };
  
  try {
    console.log(`Creating PR for ${owner}/${repo} on branch ${branchName}`);
    
    // Get repository info with timeout
    const repoResponse = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { ...headers, 'Content-Type': undefined }
    }, 5000);
    
    if (!repoResponse.ok) {
      throw new Error(`Repository not found or access denied: ${repoResponse.status}`);
    }
    
    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || 'main';
    
    console.log(`Default branch: ${defaultBranch}`);
    
    // Get latest commit SHA
    const branchResponse = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
      headers: { ...headers, 'Content-Type': undefined }
    }, 5000);
    
    if (!branchResponse.ok) {
      throw new Error(`Failed to get branch info: ${branchResponse.status}`);
    }
    
    const branchData = await branchResponse.json();
    const latestSha = branchData.object.sha;
    
    console.log(`Latest SHA: ${latestSha}`);
    
    // Create new branch
    const createBranchResponse = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: latestSha
      })
    }, 5000);
    
    if (!createBranchResponse.ok && createBranchResponse.status !== 422) {
      console.warn(`Branch creation failed: ${createBranchResponse.status}`);
    } else {
      console.log(`Branch ${branchName} created or already exists`);
    }
    
    // Create an initial commit on the branch to enable PR creation
    try {
      const readmeContent = `# ${taskTitle}

This branch was created for CodeWhisperer task delegation.

## Task Details
- **Objective:** ${objective}
- **Constraints:** ${constraints}

## Acceptance Criteria
${acceptanceCriteria.map(criteria => `- ${criteria}`).join('\n')}

## Next Steps
1. Implement the required changes
2. Test the implementation
3. Update this README with progress
4. Mark PR as ready for review

---
*Generated by AIPM CodeWhisperer delegation*
`;

      // Create blob for README
      const blobResponse = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: Buffer.from(readmeContent).toString('base64'),
          encoding: 'base64'
        })
      }, 5000);
      
      if (blobResponse.ok) {
        const blobData = await blobResponse.json();
        
        // Create tree with the README
        const treeResponse = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            base_tree: latestSha,
            tree: [{
              path: 'TASK_README.md',
              mode: '100644',
              type: 'blob',
              sha: blobData.sha
            }]
          })
        }, 5000);
        
        if (treeResponse.ok) {
          const treeData = await treeResponse.json();
          
          // Create commit
          const commitResponse = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              message: `Initial commit for CodeWhisperer task: ${taskTitle}`,
              tree: treeData.sha,
              parents: [latestSha]
            })
          }, 5000);
          
          if (commitResponse.ok) {
            const commitData = await commitResponse.json();
            
            // Update branch reference to point to new commit
            await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branchName}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                sha: commitData.sha
              })
            }, 5000);
            
            console.log(`Initial commit created on branch ${branchName}`);
          }
        }
      }
    } catch (commitError) {
      console.warn('Failed to create initial commit:', commitError.message);
      // Continue anyway - PR creation might still work
    }
    
    // Create PR body
    const prBody = `## CodeWhisperer Task: ${taskTitle}

**Objective:** ${objective}

**Constraints:** ${constraints}

**Acceptance Criteria:**
${acceptanceCriteria.map(criteria => `- ${criteria}`).join('\n')}

---
*This PR was automatically created by AIPM CodeWhisperer delegation.*`;

    // Create PR
    const prResponse = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: taskTitle,
        head: branchName,
        base: defaultBranch,
        body: prBody,
        draft: true
      })
    }, 10000);

    if (!prResponse.ok) {
      const errorText = await prResponse.text();
      throw new Error(`PR creation failed: ${prResponse.status} - ${errorText}`);
    }

    const prData = await prResponse.json();
    console.log(`PR created: ${prData.html_url}`);
    
    return prData;
    
  } catch (error) {
    console.error('GitHub PR creation error:', error.message);
    throw error;
  }
}
    
    // Handle CodeWhisperer status
    if (requestPath === '/personal-delegate/status' && httpMethod === 'GET') {
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
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(mockStatus)
      };
    }
    
    // Default 404 response
    return {
      statusCode: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Not Found',
        message: `Path ${requestPath} not found`,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
