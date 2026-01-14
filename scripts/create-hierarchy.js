import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'aipm-backend-prod-stories';

const UX_ROOT = 1768381708925;
const DEV_ROOT = 1768381952448;

async function createHierarchy() {
  const stories = await docClient.send(new ScanCommand({ TableName: TABLE }));
  const allStories = stories.Items;
  
  // User Experience sub-categories
  const uxCategories = [
    { id: Date.now() + 1, title: 'Configuration & Environment', stories: ['A1:', 'A2:'] },
    { id: Date.now() + 2, title: 'Core Features', stories: ['B1:', 'B3:', 'B5:'] },
    { id: Date.now() + 3, title: 'UI Components', stories: ['C1:', 'C2:', 'C3:', 'C4:', 'C5:', 'C6:'] },
    { id: Date.now() + 4, title: 'Setup & Bootstrap', stories: ['D1:', 'D3:'] },
    { id: Date.now() + 5, title: 'Workflows', stories: ['E4:'] },
    { id: Date.now() + 6, title: 'Testing UI', stories: ['F1:', 'F2:', 'F3:'] },
    { id: Date.now() + 7, title: 'Security', stories: ['G1:', 'G2:', 'G3:', 'G4:'] },
    { id: Date.now() + 8, title: 'CI/CD', stories: ['H4:'] },
    { id: Date.now() + 9, title: 'Monitoring', stories: ['I4:'] },
    { id: Date.now() + 10, title: 'Configuration Management', stories: ['J2:'] },
    { id: Date.now() + 11, title: 'AI Integration', stories: ['K2:'] },
    { id: Date.now() + 12, title: 'Operations', stories: ['L1:', 'L3:'] },
    { id: Date.now() + 13, title: 'UI Improvements', stories: [] } // catch-all for UI stories
  ];
  
  // Development & Delivery sub-categories
  const devCategories = [
    { id: Date.now() + 101, title: 'Compatibility', stories: ['A3:'] },
    { id: Date.now() + 102, title: 'External Integrations', stories: ['K1:', 'K3:'] },
    { id: Date.now() + 103, title: 'API Endpoints', stories: ['B4:', 'B6:'] },
    { id: Date.now() + 104, title: 'Environment', stories: ['D2:'] },
    { id: Date.now() + 105, title: 'PR & Deployment', stories: ['E2:', 'E3:'] },
    { id: Date.now() + 106, title: 'Deployment', stories: ['H1:', 'H2:', 'H3:'] },
    { id: Date.now() + 107, title: 'Operations', stories: ['I1:', 'I3:'] },
    { id: Date.now() + 108, title: 'Configuration', stories: ['J1:', 'J3:'] },
    { id: Date.now() + 109, title: 'Automation', stories: ['Automatic', 'User Story Generation'] }
  ];
  
  console.log('Creating User Experience sub-categories...');
  for (const cat of uxCategories) {
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id: cat.id,
        title: cat.title,
        description: `${cat.title} related features`,
        parent_id: UX_ROOT,
        status: 'Draft',
        story_point: 0,
        components: ['WorkModel'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }));
    console.log(`  Created: ${cat.title} (${cat.id})`);
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log('\nCreating Development & Delivery sub-categories...');
  for (const cat of devCategories) {
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id: cat.id,
        title: cat.title,
        description: `${cat.title} related features`,
        parent_id: DEV_ROOT,
        status: 'Draft',
        story_point: 0,
        components: ['WorkModel'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }));
    console.log(`  Created: ${cat.title} (${cat.id})`);
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log('\nRemapping User Experience children...');
  const uxChildren = allStories.filter(s => s.parent_id === UX_ROOT);
  for (const story of uxChildren) {
    let matched = false;
    for (const cat of uxCategories) {
      if (cat.stories.some(prefix => story.title.startsWith(prefix))) {
        await docClient.send(new UpdateCommand({
          TableName: TABLE,
          Key: { id: story.id },
          UpdateExpression: 'SET parent_id = :pid',
          ExpressionAttributeValues: { ':pid': cat.id }
        }));
        console.log(`  ${story.title} → ${cat.title}`);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Move to UI Improvements
      const uiCat = uxCategories.find(c => c.title === 'UI Improvements');
      await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: story.id },
        UpdateExpression: 'SET parent_id = :pid',
        ExpressionAttributeValues: { ':pid': uiCat.id }
      }));
      console.log(`  ${story.title} → UI Improvements`);
    }
  }
  
  console.log('\nRemapping Development & Delivery children...');
  const devChildren = allStories.filter(s => s.parent_id === DEV_ROOT);
  for (const story of devChildren) {
    let matched = false;
    for (const cat of devCategories) {
      if (cat.stories.some(prefix => story.title.includes(prefix))) {
        await docClient.send(new UpdateCommand({
          TableName: TABLE,
          Key: { id: story.id },
          UpdateExpression: 'SET parent_id = :pid',
          ExpressionAttributeValues: { ':pid': cat.id }
        }));
        console.log(`  ${story.title} → ${cat.title}`);
        matched = true;
        break;
      }
    }
  }
  
  console.log('\nDone!');
}

createHierarchy();
