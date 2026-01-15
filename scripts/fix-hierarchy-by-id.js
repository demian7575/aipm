import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';

// Get all stories
const { Items: stories } = await dynamodb.send(new ScanCommand({ TableName: STORIES_TABLE }));

console.log(`📊 Found ${stories.length} stories`);

// Analyze hierarchy based on ID patterns
function getParentId(id) {
  if (id >= 1000) {
    // Root or sub-category
    if (id % 1000 === 0) {
      // Root (1000, 2000, 3000, etc.) - no parent
      return null;
    } else if (id % 10 === 0) {
      // Sub-category (1010, 1020, 2010, etc.) - parent is root
      return Math.floor(id / 1000) * 1000;
    }
  } else if (id >= 100) {
    // Three-digit leaf story (101, 102, 512, etc.)
    // Parent is the sub-category: first digit * 1000 + second digit * 10
    const firstDigit = Math.floor(id / 100);
    const secondDigit = Math.floor((id % 100) / 10);
    return firstDigit * 1000 + secondDigit * 10;
  } else if (id >= 10) {
    // Two-digit story (10-99) - treat as orphan or assign to a default parent
    return null;
  } else {
    // Single-digit story (1-9) - treat as orphan
    return null;
  }
  return null;
}

// Update parent_id for all stories
let updated = 0;
for (const story of stories) {
  const parentId = getParentId(story.id);
  
  if (story.parent_id !== parentId) {
    await dynamodb.send(new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: { id: story.id },
      UpdateExpression: 'SET parent_id = :parent, updated_at = :updated',
      ExpressionAttributeValues: {
        ':parent': parentId,
        ':updated': new Date().toISOString()
      }
    }));
    console.log(`✅ Story ${story.id} (${story.title}): parent_id = ${parentId}`);
    updated++;
  }
}

console.log(`\n✅ Updated ${updated} stories with correct parent_id`);

// Verify hierarchy
const roots = stories.filter(s => getParentId(s.id) === null);
const subs = stories.filter(s => {
  const p = getParentId(s.id);
  return p !== null && p % 1000 === 0;
});
const leaves = stories.filter(s => {
  const p = getParentId(s.id);
  return p !== null && p % 10 === 0;
});

console.log(`\n📊 Hierarchy:`);
console.log(`   - ${roots.length} root categories`);
console.log(`   - ${subs.length} sub-categories`);
console.log(`   - ${leaves.length} leaf stories`);
