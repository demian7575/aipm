// Story-PR association management
// Stores PR connections directly in stories table

export async function getStoryPRs(db, storyId) {
  if (db.type === 'dynamodb') {
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const result = await db.client.send(new GetCommand({
      TableName: db.storiesTable,
      Key: { id: Number(storyId) }
    }));
    
    return result.Item?.prs || [];
  } else {
    // SQLite
    const story = db.prepare('SELECT prs FROM stories WHERE id = ?').get(storyId);
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
  
  if (db.type === 'dynamodb') {
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    await db.client.send(new UpdateCommand({
      TableName: db.storiesTable,
      Key: { id: Number(storyId) },
      UpdateExpression: 'SET prs = :prs',
      ExpressionAttributeValues: {
        ':prs': prs
      }
    }));
  } else {
    // SQLite
    db.prepare('UPDATE stories SET prs = ? WHERE id = ?').run(JSON.stringify(prs), storyId);
  }
  
  return prs;
}

export async function removeStoryPR(db, storyId, prNumber) {
  const prs = await getStoryPRs(db, storyId);
  const filtered = prs.filter(pr => pr.number !== prNumber);
  
  if (db.type === 'dynamodb') {
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    await db.client.send(new UpdateCommand({
      TableName: db.storiesTable,
      Key: { id: Number(storyId) },
      UpdateExpression: 'SET prs = :prs',
      ExpressionAttributeValues: {
        ':prs': filtered
      }
    }));
  } else {
    // SQLite
    db.prepare('UPDATE stories SET prs = ? WHERE id = ?').run(JSON.stringify(filtered), storyId);
  }
  
  return filtered;
}
