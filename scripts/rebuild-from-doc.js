import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'aipm-backend-prod-stories';

const doc = readFileSync('./docs/user-stories.md', 'utf-8');

// Root categories with fixed IDs
const roots = {
  'Core Services': 1768381363027,
  'Platform Architecture': 1768381124499,
  'User Experience': 1768381708925,
  'Quality & Security': 1768382265445,
  'Operations': 1768382546495,
  'Development & Delivery': 1768381952448
};

// Sub-categories with fixed IDs
const subCategories = {
  'Configuration & Environment': 1768403708734,
  'Core Features': 1768403708735,
  'UI Components': 1768403708736,
  'Setup & Bootstrap': 1768403708737,
  'Workflows': 1768403708738,
  'Testing UI': 1768403708739,
  'Security': 1768403708740,
  'CI/CD': 1768403708741,
  'Monitoring': 1768403708742,
  'Configuration Management': 1768403708743,
  'AI Integration': 1768403708744,
  'Operations': 1768403708745,
  'UI Improvements': 1768403708746,
  'Compatibility': 1768403708834,
  'External Integrations': 1768403708835,
  'API Endpoints': 1768403708836,
  'Environment': 1768403708837,
  'PR & Deployment': 1768403708838,
  'Deployment': 1768403708839,
  'Configuration': 1768403708841,
  'Automation': 1768403708842
};

// Add duplicate "Operations" for Dev & Delivery
subCategories['Operations_Dev'] = 1768403708840;

async function rebuild() {
  const lines = doc.split('\n');
  let currentRoot = null;
  let currentSub = null;
  
  // Create root categories
  console.log('Creating root categories...');
  for (const [title, id] of Object.entries(roots)) {
    const descLine = lines.find((l, i) => 
      lines[i-1]?.startsWith(`## ${lines[i-1].match(/\d+\. /)?.[0] || ''}${title}`)
    );
    const description = descLine?.trim() || `${title} related features`;
    
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id,
        title,
        description,
        parent_id: null,
        status: 'Draft',
        story_point: 0,
        components: ['WorkModel'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }));
    console.log(`  Created root: ${title}`);
  }
  
  // Parse and create sub-categories and leaf stories
  console.log('\nCreating sub-categories and stories...');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Root category
    if (line.match(/^## \d+\. /)) {
      const title = line.replace(/^## \d+\. /, '').trim();
      currentRoot = roots[title];
      currentSub = null;
    }
    
    // Sub-category (only if it has a number like 3.1, 6.2)
    else if (line.match(/^### \d+\.\d+ /)) {
      const title = line.replace(/^### \d+\.\d+ /, '').trim();
      let subId = subCategories[title];
      
      // Handle duplicate "Operations"
      if (title === 'Operations' && currentRoot === roots['Development & Delivery']) {
        subId = subCategories['Operations_Dev'];
      }
      
      if (subId) {
        currentSub = subId;
        await docClient.send(new PutCommand({
          TableName: TABLE,
          Item: {
            id: subId,
            title,
            description: `${title} related features`,
            parent_id: currentRoot,
            status: 'Draft',
            story_point: 0,
            components: ['WorkModel'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }));
        console.log(`  Created sub-category: ${title}`);
      }
    }
    
    // Leaf story with ### (no number prefix)
    else if (line.match(/^### [^0-9]/)) {
      const title = line.replace(/^### /, '').trim();
      const idLine = lines[i + 1];
      const descLine = lines[i + 2];
      
      if (idLine?.includes('**ID**:')) {
        const id = parseInt(idLine.match(/\d+/)[0]);
        const description = descLine?.includes('**Description**:') 
          ? descLine.replace(/.*\*\*Description\*\*: /, '').trim()
          : '';
        
        const parentId = currentRoot;
        
        await docClient.send(new PutCommand({
          TableName: TABLE,
          Item: {
            id,
            title,
            description,
            parent_id: parentId,
            status: 'Draft',
            story_point: 0,
            components: ['WorkModel'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }));
        console.log(`  Created story: ${title} (${id})`);
      }
    }
    
    // Leaf story
    else if (line.match(/^#### /)) {
      const title = line.replace(/^#### /, '').trim();
      const idLine = lines[i + 1];
      const descLine = lines[i + 2];
      
      if (idLine?.includes('**ID**:')) {
        const id = parseInt(idLine.match(/\d+/)[0]);
        const description = descLine?.includes('**Description**:') 
          ? descLine.replace(/.*\*\*Description\*\*: /, '').trim()
          : '';
        
        const parentId = currentSub || currentRoot;
        
        await docClient.send(new PutCommand({
          TableName: TABLE,
          Item: {
            id,
            title,
            description,
            parent_id: parentId,
            status: 'Draft',
            story_point: 0,
            components: ['WorkModel'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }));
        console.log(`    Created story: ${title} (${id})`);
      }
    }
  }
  
  console.log('\nDone!');
}

rebuild();
