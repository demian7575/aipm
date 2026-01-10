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
  
  await docClient.send(new DeleteCommand({
    TableName: tableName,
    Key: {
      id: prToDelete.localId
    }
  }));
  
  return await getStoryPRs(db, storyId);
}
