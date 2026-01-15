import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function analyze() {
  const result = await docClient.send(new ScanCommand({ TableName: 'aipm-backend-prod-stories' }));
  const stories = result.Items;
  
  // Root: parent_id is null
  const roots = stories.filter(s => !s.parent_id);
  
  // Get all story IDs
  const allIds = new Set(stories.map(s => s.id));
  
  // Branch: has parent_id AND has children
  const childrenMap = new Map();
  stories.forEach(s => {
    if (s.parent_id) {
      if (!childrenMap.has(s.parent_id)) {
        childrenMap.set(s.parent_id, []);
      }
      childrenMap.get(s.parent_id).push(s.id);
    }
  });
  
  const branches = stories.filter(s => s.parent_id && childrenMap.has(s.id));
  
  // Leaves: has parent_id AND no children
  const leaves = stories.filter(s => s.parent_id && !childrenMap.has(s.id));
  
  console.log('=== Story Hierarchy Analysis ===\n');
  console.log(`Root stories: ${roots.length}`);
  roots.forEach(r => console.log(`  ${r.id} - ${r.title}`));
  
  console.log(`\nBranch stories (sub-categories): ${branches.length}`);
  branches.forEach(b => console.log(`  ${b.id} - ${b.title} (${childrenMap.get(b.id).length} children)`));
  
  console.log(`\nLeaf stories: ${leaves.length}`);
  console.log(`\nTotal: ${stories.length} stories`);
  console.log(`  = ${roots.length} roots + ${branches.length} branches + ${leaves.length} leaves`);
}

analyze();
