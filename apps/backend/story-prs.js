// Story-PR association management
// Stores PR connections directly in stories table

export async function getStoryPRs(db, storyId) {
  console.log(`getStoryPRs called for story ${storyId}, db type: ${db.constructor.name}`);
  
  if (db.constructor.name === 'DynamoDBDataLayer') {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(client);
    const tableName = process.env.STORIES_TABLE || 'aipm-backend-prod-stories';
    
    console.log(`Fetching PRs from DynamoDB table: ${tableName}`);
    
    const result = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { id: Number(storyId) }
    }));
    
    console.log(`DynamoDB result for story ${storyId}:`, result.Item ? 'found' : 'not found', result.Item?.prs ? `${result.Item.prs.length} PRs` : 'no prs field');
    
    return result.Item?.prs || [];
  } else {
    // SQLite
    const story = db.prepare('SELECT prs FROM user_stories WHERE id = ?').get(storyId);
    if (!story || !story.prs) return [];
    return JSON.parse(story.prs);
  }
}

export async function addStoryPR(db, storyId, prData) {
  const prs = await getStoryPRs(db, storyId);
  
  // Check if PR already exists
  const existingIndex = prs.findIndex(pr => pr.number === prData.number);
  if (existingIndex >= 0) {
    prs[existingIndex] = { ...prs[existingIndex], ...prData, updatedAt: new Date().toISOString() };
  } else {
    prs.push({ ...prData, createdAt: new Date().toISOString() });
  }
  
  if (db.constructor.name === 'DynamoDBDataLayer') {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true }
    });
    const tableName = process.env.STORIES_TABLE || 'aipm-backend-prod-stories';
    
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { id: Number(storyId) },
      UpdateExpression: 'SET prs = :prs',
      ExpressionAttributeValues: {
        ':prs': prs
      }
    }));
  } else {
    // SQLite
    db.prepare('UPDATE user_stories SET prs = ? WHERE id = ?').run(JSON.stringify(prs), storyId);
  }
  
  return prs;
}

export async function removeStoryPR(db, storyId, prNumber) {
  const prs = await getStoryPRs(db, storyId);
  const filtered = prs.filter(pr => pr.number !== prNumber);
  
  if (db.constructor.name === 'DynamoDBDataLayer') {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true }
    });
    const tableName = process.env.STORIES_TABLE || 'aipm-backend-prod-stories';
    
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { id: Number(storyId) },
      UpdateExpression: 'SET prs = :prs',
      ExpressionAttributeValues: {
        ':prs': filtered
      }
    }));
  } else {
    // SQLite
    db.prepare('UPDATE user_stories SET prs = ? WHERE id = ?').run(JSON.stringify(filtered), storyId);
  }
  
  return filtered;
}
