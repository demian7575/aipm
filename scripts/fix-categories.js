import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'aipm-backend-prod-stories';

const UX_ROOT = 1768381708925;
const DEV_ROOT = 1768381952448;

const uxCategories = [
  1768403708734, 1768403708735, 1768403708736, 1768403708737,
  1768403708738, 1768403708739, 1768403708740, 1768403708741,
  1768403708742, 1768403708743, 1768403708744, 1768403708745,
  1768403708746
];

const devCategories = [
  1768403708834, 1768403708835, 1768403708836, 1768403708837,
  1768403708838, 1768403708839, 1768403708840, 1768403708841,
  1768403708842
];

async function fixCategories() {
  console.log('Fixing UX categories...');
  for (const catId of uxCategories) {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: catId },
      UpdateExpression: 'SET parent_id = :pid',
      ExpressionAttributeValues: { ':pid': UX_ROOT }
    }));
    console.log(`  ${catId} → UX_ROOT`);
  }
  
  console.log('\nFixing Dev categories...');
  for (const catId of devCategories) {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: catId },
      UpdateExpression: 'SET parent_id = :pid',
      ExpressionAttributeValues: { ':pid': DEV_ROOT }
    }));
    console.log(`  ${catId} → DEV_ROOT`);
  }
  
  console.log('\nDone!');
}

fixCategories();
