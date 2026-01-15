import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

// Find test stories (timestamp-based IDs with test-related content)
const { Items: stories } = await dynamodb.send(new ScanCommand({ TableName: STORIES_TABLE }));

const testStories = stories.filter(s => 
  s.id > 1000000 && // Timestamp-based ID
  s.asA && (
    (s.asA === 'developer' && s.iWant && s.iWant.includes('test')) ||
    (s.asA === 'user' && s.iWant && s.iWant.includes('test')) ||
    (s.asA === 'system user' && s.iWant && s.iWant.includes('test'))
  )
);

console.log(`Found ${testStories.length} test stories to delete`);

// Delete test stories and their acceptance tests
for (const story of testStories) {
  // Delete acceptance tests first
  const { Items: tests } = await dynamodb.send(new QueryCommand({
    TableName: TESTS_TABLE,
    IndexName: 'storyId-index',
    KeyConditionExpression: 'storyId = :sid',
    ExpressionAttributeValues: { ':sid': story.id }
  }));
  
  for (const test of tests || []) {
    await dynamodb.send(new DeleteCommand({
      TableName: TESTS_TABLE,
      Key: { id: test.id }
    }));
  }
  
  // Delete story
  await dynamodb.send(new DeleteCommand({
    TableName: STORIES_TABLE,
    Key: { id: story.id }
  }));
  
  console.log(`✅ Deleted story ${story.id}: ${story.title} (${tests?.length || 0} tests)`);
}

console.log(`\n✅ Cleanup complete - deleted ${testStories.length} test stories`);
