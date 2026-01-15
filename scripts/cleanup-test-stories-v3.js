import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

async function cleanup() {
  // Find all test stories
  const { Items: stories } = await dynamodb.send(new ScanCommand({
    TableName: STORIES_TABLE,
    FilterExpression: 'contains(title, :test)',
    ExpressionAttributeValues: {
      ':test': 'Test Feature Implementation'
    }
  }));

  console.log(`Found ${stories.length} test stories to delete`);

  for (const story of stories) {
    console.log(`Deleting story ${story.id}: ${story.title}`);
    
    // Delete acceptance tests
    const { Items: tests } = await dynamodb.send(new QueryCommand({
      TableName: TESTS_TABLE,
      IndexName: 'storyId-index',
      KeyConditionExpression: 'storyId = :sid',
      ExpressionAttributeValues: { ':sid': story.id }
    }));
    
    for (const test of tests || []) {
      console.log(`  Deleting test ${test.id}`);
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
  }

  console.log('✅ Cleanup complete');
}

cleanup().catch(console.error);
