import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'aipm-backend-prod-test-results';

const [resultsFile, phase] = process.argv.slice(2);

if (!resultsFile || !phase) {
  console.error('Usage: node upload-test-results.mjs <results-file> <phase>');
  process.exit(1);
}

const lines = readFileSync(resultsFile, 'utf-8').split('\n').filter(l => l && !l.startsWith('testId'));
const timestamp = new Date().toISOString();
const runId = `${phase}-${Date.now()}`;

console.log(`Uploading ${lines.length} test results...`);

for (const line of lines) {
  const [testId, title, status, endpoint] = line.split('|');
  
  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: {
      runId,
      testId,
      title,
      status,
      endpoint,
      phase,
      timestamp,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
    }
  }));
}

console.log(`✅ Uploaded ${lines.length} results to ${TABLE}`);
console.log(`   Run ID: ${runId}`);
