import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'aipm-backend-prod-stories';

const doc = readFileSync('./documents/user-stories.md', 'utf-8');
const lines = doc.split('\n');

async function updateStories() {
  let currentStoryId = null;
  let asA = '';
  let iWant = '';
  let soThat = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // User Story
    if (line.match(/^US-\d+ —/)) {
      // Save previous story
      if (currentStoryId && (asA || iWant || soThat)) {
        await updateStory(currentStoryId, asA, iWant, soThat);
      }
      
      const match = line.match(/^US-(\d+) — (.+)$/);
      currentStoryId = parseInt(match[1]);
      asA = '';
      iWant = '';
      soThat = '';
    }
    else if (line.startsWith('As a ') || line.startsWith('As an ')) {
      asA = line.replace(/^As an? /, '');
    }
    else if (line.startsWith('I want ')) {
      iWant = line.replace(/^I want /, '');
    }
    else if (line.startsWith('So that ')) {
      soThat = line.replace(/^So that /, '');
    }
  }
  
  // Save last story
  if (currentStoryId && (asA || iWant || soThat)) {
    await updateStory(currentStoryId, asA, iWant, soThat);
  }
  
  console.log('Done updating story fields!');
}

async function updateStory(id, asA, iWant, soThat) {
  const description = `As a ${asA} I want ${iWant} So that ${soThat}`;
  
  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: 'SET as_a = :as_a, i_want = :i_want, so_that = :so_that, description = :desc',
    ExpressionAttributeValues: {
      ':as_a': asA,
      ':i_want': iWant,
      ':so_that': soThat,
      ':desc': description
    }
  }));
  
  console.log(`Updated story ${id}: ${asA.substring(0, 30)}...`);
}

updateStories();
