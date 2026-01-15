import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';

const { Items: stories } = await dynamodb.send(new ScanCommand({ TableName: STORIES_TABLE }));

const existingIds = new Set(stories.map(s => s.id));
const referencedParents = new Set(stories.filter(s => s.parent_id).map(s => s.parent_id));

const missing = [...referencedParents].filter(id => !existingIds.has(id)).sort((a,b) => a-b);

console.log(`📊 Found ${missing.length} missing parent categories:`, missing);

// Create missing categories
for (const id of missing) {
  let title, parent_id;
  
  if (id % 1000 === 0) {
    // Root category
    title = `Root Category ${id / 1000}`;
    parent_id = null;
  } else if (id % 10 === 0) {
    // Sub-category
    const rootId = Math.floor(id / 1000) * 1000;
    title = `Sub-category ${id}`;
    parent_id = rootId;
  }
  
  await dynamodb.send(new PutCommand({
    TableName: STORIES_TABLE,
    Item: {
      id,
      title,
      parent_id,
      description: '',
      as_a: '',
      i_want: '',
      so_that: '',
      status: 'Draft',
      story_point: 0,
      components: ['WorkModel'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }));
  
  console.log(`✅ Created ${id}: ${title} (parent: ${parent_id})`);
}

console.log(`\n✅ Created ${missing.length} missing categories`);
