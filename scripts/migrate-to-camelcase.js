import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

console.log('📊 Step 1: Migrating Stories table to camelCase...');

const { Items: stories } = await dynamodb.send(new ScanCommand({ TableName: STORIES_TABLE }));

for (const story of stories) {
  const updates = [];
  const values = {};
  const removes = [];
  
  // Migrate snake_case to camelCase
  if (story.as_a !== undefined) {
    updates.push('asA = :asA');
    values[':asA'] = story.as_a;
    removes.push('as_a');
  }
  if (story.i_want !== undefined) {
    updates.push('iWant = :iWant');
    values[':iWant'] = story.i_want;
    removes.push('i_want');
  }
  if (story.so_that !== undefined) {
    updates.push('soThat = :soThat');
    values[':soThat'] = story.so_that;
    removes.push('so_that');
  }
  if (story.parent_id !== undefined) {
    updates.push('parentId = :parentId');
    values[':parentId'] = story.parent_id;
    removes.push('parent_id');
  }
  if (story.story_point !== undefined) {
    updates.push('storyPoint = :storyPoint');
    values[':storyPoint'] = story.story_point;
    removes.push('story_point');
  }
  if (story.created_at !== undefined) {
    updates.push('createdAt = :createdAt');
    values[':createdAt'] = story.created_at;
    removes.push('created_at');
  }
  if (story.updated_at !== undefined) {
    updates.push('updatedAt = :updatedAt');
    values[':updatedAt'] = story.updated_at;
    removes.push('updated_at');
  }
  
  if (updates.length > 0) {
    const expression = `SET ${updates.join(', ')} REMOVE ${removes.join(', ')}`;
    
    await dynamodb.send(new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: { id: story.id },
      UpdateExpression: expression,
      ExpressionAttributeValues: values
    }));
    
    console.log(`✅ Migrated story ${story.id}`);
  }
}

console.log(`\n📊 Step 2: Migrating Acceptance Tests table to camelCase...`);

const { Items: tests } = await dynamodb.send(new ScanCommand({ TableName: TESTS_TABLE }));

for (const test of tests) {
  const updates = [];
  const values = {};
  const removes = [];
  
  if (test.story_id !== undefined) {
    updates.push('storyId = :storyId');
    values[':storyId'] = test.story_id;
    removes.push('story_id');
  }
  if (test.when_step !== undefined) {
    updates.push('whenStep = :whenStep');
    values[':whenStep'] = test.when_step;
    removes.push('when_step');
  }
  if (test.then_step !== undefined) {
    updates.push('thenStep = :thenStep');
    values[':thenStep'] = test.then_step;
    removes.push('then_step');
  }
  if (test.created_at !== undefined) {
    updates.push('createdAt = :createdAt');
    values[':createdAt'] = test.created_at;
    removes.push('created_at');
  }
  if (test.updated_at !== undefined) {
    updates.push('updatedAt = :updatedAt');
    values[':updatedAt'] = test.updated_at;
    removes.push('updated_at');
  }
  
  if (updates.length > 0) {
    const expression = `SET ${updates.join(', ')} REMOVE ${removes.join(', ')}`;
    
    await dynamodb.send(new UpdateCommand({
      TableName: TESTS_TABLE,
      Key: { id: test.id },
      UpdateExpression: expression,
      ExpressionAttributeValues: values
    }));
    
    console.log(`✅ Migrated test ${test.id}`);
  }
}

console.log('\n✅ Migration complete!');
console.log(`   - ${stories.length} stories migrated`);
console.log(`   - ${tests.length} tests migrated`);
