import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

const TEST_STORY_IDS = [
  1768399621372, 1768399660798, 1768399763745, 1768400860615,
  1768400866861, 1768400902826, 1768401020858, 1768401058135,
  1768401156981, 1768401197676
];

async function cleanup() {
  console.log(`Deleting ${TEST_STORY_IDS.length} test stories and their acceptance tests...`);
  
  for (const storyId of TEST_STORY_IDS) {
    // Delete acceptance tests for this story
    const tests = await docClient.send(new ScanCommand({ TableName: TESTS_TABLE }));
    const storyTests = tests.Items.filter(t => t.story_id === storyId);
    
    for (const test of storyTests) {
      await docClient.send(new DeleteCommand({
        TableName: TESTS_TABLE,
        Key: { id: test.id }
      }));
      console.log(`  Deleted test ${test.id} for story ${storyId}`);
    }
    
    // Delete story
    await docClient.send(new DeleteCommand({
      TableName: STORIES_TABLE,
      Key: { id: storyId }
    }));
    console.log(`Deleted story ${storyId}`);
  }
  
  console.log('Cleanup complete!');
}

cleanup();
