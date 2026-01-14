import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'aipm-backend-prod-acceptance-tests';

async function normalize() {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE }));
  const itemsToFix = result.Items.filter(item => item.storyId && !item.story_id);
  
  console.log(`Found ${itemsToFix.length} items with storyId to normalize`);
  
  for (const item of itemsToFix) {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: item.id },
      UpdateExpression: 'SET story_id = :val REMOVE storyId',
      ExpressionAttributeValues: { ':val': item.storyId }
    }));
    console.log(`Fixed item ${item.id}`);
  }
  
  console.log('Done');
}

normalize();
