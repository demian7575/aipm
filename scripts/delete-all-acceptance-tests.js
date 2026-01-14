import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'aipm-backend-prod-acceptance-tests';

async function deleteAll() {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE }));
  console.log(`Found ${result.Items.length} acceptance tests to delete`);
  
  for (const item of result.Items) {
    await docClient.send(new DeleteCommand({
      TableName: TABLE,
      Key: { id: item.id }
    }));
    console.log(`Deleted test ${item.id}`);
  }
  
  console.log('Done');
}

deleteAll();
