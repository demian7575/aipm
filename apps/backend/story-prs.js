// Minimal story PRs functions
export async function getStoryPRs(db, storyId) {
  console.log('🔍 getStoryPRs called for story:', storyId);
  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(client);
    
    const tableName = process.env.PRS_TABLE || 'aipm-backend-prod-prs';
    console.log('📊 Querying PRs table:', tableName, 'for story:', storyId);
    
    const result = await docClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'story-id-index',
      KeyConditionExpression: 'story_id = :storyId',
      ExpressionAttributeValues: {
        ':storyId': storyId
      }
    }));
    
    console.log('📊 Found PRs:', result.Items?.length || 0);
    
    return (result.Items || []).map(item => ({
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
  } catch (error) {
    console.error('❌ Error fetching PRs for story', storyId, ':', error);
    return [];
  }
}

export async function addStoryPR(db, storyId, prData) {
  console.log('🔍 addStoryPR called for story:', storyId, 'with data:', prData);
  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(client);
    
    const tableName = process.env.PRS_TABLE || 'aipm-backend-prod-prs';
    const timestamp = new Date().toISOString();
    
    // Generate unique PR ID if not provided
    const prId = prData.localId || prData.id || `pr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const item = {
      id: prId,
      story_id: storyId,
      task_title: prData.taskTitle || prData.title || 'Untitled Task',
      created_at: prData.createdAt || timestamp,
      updated_at: prData.updatedAt || timestamp,
      repo: prData.repo || 'demian7575/aipm',
      branch_name: prData.branchName || prData.branch_name || '',
      target: prData.target || 'pull-request',
      target_number: prData.targetNumber || prData.number || prData.target_number || 0,
      pr_url: prData.prUrl || prData.pr_url || '',
      html_url: prData.htmlUrl || prData.html_url || prData.prUrl || prData.pr_url || '',
      task_url: prData.taskUrl || prData.task_url || prData.prUrl || prData.pr_url || '',
      assignee: prData.assignee || '',
      create_tracking_card: prData.createTrackingCard !== undefined ? prData.createTrackingCard : true
    };
    
    console.log('📊 Saving PR to DynamoDB:', tableName, 'item:', item);
    
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: item
    }));
    
    console.log('✅ PR saved successfully');
    return { success: true, id: prId };
  } catch (error) {
    console.error('❌ Error saving PR for story', storyId, ':', error);
    return { success: false, error: error.message };
  }
}

export async function removeStoryPR(db, storyId, prId) {
  return { success: true };
}
