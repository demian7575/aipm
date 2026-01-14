// Minimal story PRs functions
export async function getStoryPRs(db, storyId) {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
  
  const client = new DynamoDBClient({ region: process.env.AWS_REGION });
  const docClient = DynamoDBDocumentClient.from(client);
  
  const tableName = process.env.PRS_TABLE;
  
  const result = await docClient.send(new QueryCommand({
    TableName: tableName,
    IndexName: 'story-id-index',
    KeyConditionExpression: 'story_id = :storyId',
    ExpressionAttributeValues: {
      ':storyId': storyId
    }
  }));
  
  return result.Items.map(item => ({
    localId: item.id,
    storyId: item.story_id,
    taskTitle: item.task_title,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    repo: item.repo,
    branchName: item.branch_name,
    target: item.target,
    targetNumber: item.target_number,
    number: item.target_number,
    prUrl: item.pr_url,
    htmlUrl: item.html_url,
    taskUrl: item.task_url,
    assignee: item.assignee,
    createTrackingCard: item.create_tracking_card
  }));
}

export async function addStoryPR(db, storyId, prData) {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb');
  
  const client = new DynamoDBClient({ region: process.env.AWS_REGION });
  const docClient = DynamoDBDocumentClient.from(client);
  
  const tableName = process.env.PRS_TABLE;
  const timestamp = new Date().toISOString();
  
  const prId = prData.localId || `pr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const item = {
    id: prId,
    story_id: storyId,
    task_title: prData.taskTitle,
    created_at: prData.createdAt || timestamp,
    updated_at: prData.updatedAt || timestamp,
    repo: prData.repo,
    branch_name: prData.branchName,
    target: prData.target,
    target_number: prData.targetNumber,
    pr_url: prData.prUrl,
    html_url: prData.htmlUrl,
    task_url: prData.taskUrl,
    assignee: prData.assignee,
    create_tracking_card: prData.createTrackingCard
  };
  
  await docClient.send(new PutCommand({
    TableName: tableName,
    Item: item
  }));
  
  return { success: true, id: prId };
}

export async function removeStoryPR(db, storyId, prNumber) {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
  
  const client = new DynamoDBClient({ region: process.env.AWS_REGION });
  const docClient = DynamoDBDocumentClient.from(client);
  
  const tableName = process.env.PRS_TABLE;
  
  const currentPRs = await getStoryPRs(db, storyId);
  const prToDelete = currentPRs.find(pr => pr.number == prNumber);
  
  if (prToDelete) {
    // Close the GitHub PR before removing from database
    try {
      await closeGitHubPR(prToDelete);
    } catch (error) {
      console.error('Failed to close GitHub PR:', error);
      // Continue with database removal even if GitHub close fails
    }
    
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: {
        id: prToDelete.localId
      }
    }));
  }
  
  return await getStoryPRs(db, storyId);
}

async function closeGitHubPR(prData) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token not configured');
  }
  
  if (!prData.repo || !prData.number) {
    throw new Error('Missing repo or PR number');
  }
  
  const url = `https://api.github.com/repos/${prData.repo}/pulls/${prData.number}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'aipm-backend',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      state: 'closed'
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }
  
  return await response.json();
}
