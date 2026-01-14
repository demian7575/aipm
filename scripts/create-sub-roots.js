import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'aipm-backend-prod-stories';

const UX_ROOT = 1768381708925;
const DEV_ROOT = 1768381952448;

// User Experience sub-categories
const UX_CATEGORIES = [
  { prefix: 'A', title: 'Configuration & Environment', description: 'Runtime topology, environment endpoints, and configuration' },
  { prefix: 'B', title: 'Core Features', description: 'Story CRUD, GitHub automation, file uploads' },
  { prefix: 'C', title: 'UI Components', description: 'Panels, mindmap, modals, details, heat map, export' },
  { prefix: 'D', title: 'Setup & Bootstrap', description: 'Local bootstrap, AWS/IAM setup' },
  { prefix: 'E', title: 'Workflows', description: 'Code generation and automation workflows' },
  { prefix: 'F', title: 'Testing UI', description: 'Gating suites, browser validation, test guidance' },
  { prefix: 'G', title: 'Security', description: 'Token handling, secrets, access control, data protection' },
  { prefix: 'H', title: 'CI/CD', description: 'CI/CD workflows and deployment' },
  { prefix: 'I', title: 'Monitoring', description: 'Performance diagnostics and monitoring' },
  { prefix: 'J', title: 'Configuration Management', description: 'Feature flagging and configuration' },
  { prefix: 'K', title: 'AI Integration', description: 'Kiro CLI/API integration' },
  { prefix: 'L', title: 'Operations', description: 'Routine maintenance and disaster recovery' },
  { prefix: 'UI', title: 'UI Improvements', description: 'User interface enhancements and fixes' }
];

// Development & Delivery sub-categories  
const DEV_CATEGORIES = [
  { prefix: 'A3', title: 'Compatibility', description: 'Legacy compatibility and migration' },
  { prefix: 'K', title: 'External Integrations', description: 'GitHub REST, AWS services integration' },
  { prefix: 'B', title: 'API Endpoints', description: 'Health, config, and data model endpoints' },
  { prefix: 'D2', title: 'Environment', description: 'Environment variables and configuration' },
  { prefix: 'E', title: 'PR & Deployment', description: 'PR creation, assignment, deployment dispatch' },
  { prefix: 'H', title: 'Deployment', description: 'Production, development, and unified deployment' },
  { prefix: 'I', title: 'Operations', description: 'Health probes, troubleshooting, log access' },
  { prefix: 'J', title: 'Configuration', description: 'Environment configs, versioning' },
  { prefix: 'Auto', title: 'Automation', description: 'Automatic versioning and story generation' }
];

async function createSubRoots() {
  const stories = await docClient.send(new ScanCommand({ TableName: TABLE }));
  const categoryMap = {};
  
  // Create UX sub-roots
  console.log('Creating User Experience sub-categories...');
  for (const cat of UX_CATEGORIES) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id,
        title: cat.title,
        description: cat.description,
        parent_id: UX_ROOT,
        status: 'Draft',
        story_point: 0,
        components: ['WorkModel'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }));
    categoryMap[`UX-${cat.prefix}`] = id;
    console.log(`  Created: ${cat.title} (${id})`);
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Create Dev sub-roots
  console.log('\nCreating Development & Delivery sub-categories...');
  for (const cat of DEV_CATEGORIES) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id,
        title: cat.title,
        description: cat.description,
        parent_id: DEV_ROOT,
        status: 'Draft',
        story_point: 0,
        components: ['WorkModel'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }));
    categoryMap[`DEV-${cat.prefix}`] = id;
    console.log(`  Created: ${cat.title} (${id})`);
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Remap UX children
  console.log('\nRemapping User Experience children...');
  const uxChildren = stories.Items.filter(s => s.parent_id === UX_ROOT);
  for (const story of uxChildren) {
    let newParent = null;
    const title = story.title;
    
    // Match by prefix
    for (const cat of UX_CATEGORIES) {
      if (title.startsWith(cat.prefix + ':') || title.startsWith(cat.prefix + '1') || 
          (cat.prefix === 'UI' && !title.match(/^[A-Z]\d:/))) {
        newParent = categoryMap[`UX-${cat.prefix}`];
        break;
      }
    }
    
    if (newParent) {
      await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: story.id },
        UpdateExpression: 'SET parent_id = :pid',
        ExpressionAttributeValues: { ':pid': newParent }
      }));
      console.log(`  ${title} → ${newParent}`);
    }
  }
  
  // Remap Dev children
  console.log('\nRemapping Development & Delivery children...');
  const devChildren = stories.Items.filter(s => s.parent_id === DEV_ROOT);
  for (const story of devChildren) {
    let newParent = null;
    const title = story.title;
    
    // Match by prefix
    for (const cat of DEV_CATEGORIES) {
      if (title.startsWith(cat.prefix + ':') || title.startsWith(cat.prefix + '1') ||
          (cat.prefix === 'Auto' && title.includes('Automatic'))) {
        newParent = categoryMap[`DEV-${cat.prefix}`];
        break;
      }
    }
    
    if (newParent) {
      await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: story.id },
        UpdateExpression: 'SET parent_id = :pid',
        ExpressionAttributeValues: { ':pid': newParent }
      }));
      console.log(`  ${title} → ${newParent}`);
    }
  }
  
  console.log('\nDone!');
}

createSubRoots();
