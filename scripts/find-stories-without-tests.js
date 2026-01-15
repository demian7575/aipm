import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function find() {
  const stories = await docClient.send(new ScanCommand({ TableName: 'aipm-backend-prod-stories' }));
  const tests = await docClient.send(new ScanCommand({ TableName: 'aipm-backend-prod-acceptance-tests' }));
  
  const testsByStory = new Set(tests.Items.map(t => t.story_id));
  
  const leafStories = stories.Items.filter(s => 
    s.parent_id && s.id < 1000
  );
  
  const noTests = leafStories.filter(s => !testsByStory.has(s.id));
  
  console.log(`Total leaf stories: ${leafStories.length}`);
  console.log(`Stories without tests: ${noTests.length}`);
  noTests.forEach(s => console.log(`${s.id}|${s.title}|${s.description || ''}`));
}

find();
