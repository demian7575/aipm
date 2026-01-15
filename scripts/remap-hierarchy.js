import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';

// New hierarchy mapping
const hierarchy = {
  1000: { title: 'WorkModel & Data', parent_id: null },
  1010: { title: 'Story Lifecycle', parent_id: 1000 },
  1020: { title: 'Hierarchy', parent_id: 1000 },
  1030: { title: 'Metadata & Overrides', parent_id: 1000 },
  1040: { title: 'Schema & Integrity', parent_id: 1000 },
  
  2000: { title: 'UX & Collaboration', parent_id: null },
  2010: { title: 'Workspace', parent_id: 2000 },
  2020: { title: 'Mindmap', parent_id: 2000 },
  2030: { title: 'Editing Patterns', parent_id: 2000 },
  
  3000: { title: 'Quality & Governance', parent_id: null },
  3010: { title: 'Acceptance Tests', parent_id: 3000 },
  3020: { title: 'Done Gates', parent_id: 3000 },
  3030: { title: 'INVEST', parent_id: 3000 },
  
  4000: { title: 'Automation & Integrations', parent_id: null },
  4010: { title: 'GitHub Checks', parent_id: 4000 },
  4020: { title: 'PR Workflow', parent_id: 4000 },
  4030: { title: 'Agent Execution', parent_id: 4000 },
  
  5000: { title: 'Delivery & Operations', parent_id: null },
  5010: { title: 'Env Boot', parent_id: 5000 },
  5020: { title: 'Readiness & Observability', parent_id: 5000 },
  5030: { title: 'Gating & Deploy', parent_id: 5000 },
  5040: { title: 'Security Baseline', parent_id: 5000 },
  5050: { title: 'Docs & Runbooks', parent_id: 5000 }
};

// Story to parent mapping
const storyMapping = {
  101: 1010, 102: 1010, 103: 1010, 104: 1010,
  111: 1020, 112: 1020,
  121: 1030, 122: 1030,
  801: 1040, 811: 1040,
  
  301: 2010, 302: 2010,
  311: 2020, 312: 2020,
  321: 2030, 322: 2030,
  
  201: 3010, 202: 3010, 203: 3010,
  211: 3020,
  401: 3030, 411: 3030, 412: 3030,
  
  501: 4010,
  511: 4020, 512: 4020, 521: 4020,
  601: 4030, 611: 4030, 621: 4030,
  
  1: 5010, 2: 5010,
  3: 5020, 1001: 5020, 1011: 5020,
  701: 5030, 702: 5030, 711: 5030, 721: 5030, 731: 5030,
  901: 5040, 911: 5040,
  1101: 5050, 1111: 5050
};

console.log('🗑️  Step 1: Deleting all existing data...');

// Delete all stories
const { Items: stories } = await dynamodb.send(new ScanCommand({ TableName: STORIES_TABLE }));
for (const story of stories) {
  await dynamodb.send(new DeleteCommand({ TableName: STORIES_TABLE, Key: { id: story.id } }));
}
console.log(`✅ Deleted ${stories.length} stories`);

console.log('\n💾 Step 2: Creating new hierarchy...');

// Create roots and branches
for (const [id, data] of Object.entries(hierarchy)) {
  await dynamodb.send(new PutCommand({
    TableName: STORIES_TABLE,
    Item: {
      id: parseInt(id),
      title: data.title,
      parent_id: data.parent_id,
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
}
console.log(`✅ Created ${Object.keys(hierarchy).length} categories`);

console.log('\n💾 Step 3: Recreating leaf stories with new parents...');

// Recreate leaf stories with correct parent_id
const leafStories = stories.filter(s => s.as_a && s.as_a !== '');
for (const story of leafStories) {
  const newParentId = storyMapping[story.id];
  if (!newParentId) {
    console.warn(`⚠️  No mapping for story ${story.id}`);
    continue;
  }
  
  await dynamodb.send(new PutCommand({
    TableName: STORIES_TABLE,
    Item: {
      ...story,
      parent_id: newParentId,
      updated_at: new Date().toISOString()
    }
  }));
}
console.log(`✅ Recreated ${leafStories.length} leaf stories`);

console.log('\n✅ Remapping complete!');
console.log(`   - 5 roots`);
console.log(`   - 18 branches`);
console.log(`   - ${leafStories.length} leaves`);
