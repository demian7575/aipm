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
  return { success: true };
}

export async function removeStoryPR(db, storyId, prId) {
  return { success: true };
}
