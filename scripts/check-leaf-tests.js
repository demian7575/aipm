import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function checkTests() {
  const stories = await docClient.send(new ScanCommand({ TableName: 'aipm-backend-prod-stories' }));
  const tests = await docClient.send(new ScanCommand({ TableName: 'aipm-backend-prod-acceptance-tests' }));
  
  // Build children map
  const childrenMap = new Map();
  stories.Items.forEach(s => {
    if (s.parent_id) {
      if (!childrenMap.has(s.parent_id)) {
        childrenMap.set(s.parent_id, []);
      }
      childrenMap.get(s.parent_id).push(s.id);
    }
  });
  
  // Find leaves
  const leaves = stories.Items.filter(s => s.parent_id && !childrenMap.has(s.id));
  
  // Count tests per story
  const testCounts = new Map();
  tests.Items.forEach(t => {
    testCounts.set(t.story_id, (testCounts.get(t.story_id) || 0) + 1);
  });
  
  console.log(`Total leaf stories: ${leaves.length}`);
  console.log(`Total acceptance tests: ${tests.Items.length}\n`);
  
  const withNoTests = leaves.filter(s => !testCounts.has(s.id));
  const withOneTest = leaves.filter(s => testCounts.get(s.id) === 1);
  const withMultipleTests = leaves.filter(s => (testCounts.get(s.id) || 0) > 1);
  
  console.log(`Leaves with 0 tests: ${withNoTests.length}`);
  withNoTests.forEach(s => console.log(`  ${s.id} - ${s.title}`));
  
  console.log(`\nLeaves with 1 test: ${withOneTest.length}`);
  
  console.log(`\nLeaves with multiple tests: ${withMultipleTests.length}`);
  withMultipleTests.forEach(s => {
    console.log(`  ${s.id} - ${s.title} (${testCounts.get(s.id)} tests)`);
  });
  
  console.log(`\n✓ All leaves have at least one test: ${withNoTests.length === 0}`);
}

checkTests();
