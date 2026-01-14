import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'aipm-backend-prod-stories';

const UX_ROOT = 1768381708925;
const DEV_ROOT = 1768381952448;

const mapping = {
  // UX mappings
  1768403708734: ['A1:', 'A2:'], // Configuration & Environment
  1768403708735: ['B1:', 'B3:', 'B5:'], // Core Features
  1768403708736: ['C1:', 'C2:', 'C3:', 'C4:', 'C5:', 'C6:'], // UI Components
  1768403708737: ['D1:', 'D3:'], // Setup & Bootstrap
  1768403708738: ['E4:'], // Workflows
  1768403708739: ['F1:', 'F2:', 'F3:'], // Testing UI
  1768403708740: ['G1:', 'G2:', 'G3:', 'G4:'], // Security
  1768403708741: ['H4:'], // CI/CD
  1768403708742: ['I4:'], // Monitoring
  1768403708743: ['J2:'], // Configuration Management
  1768403708744: ['K2:'], // AI Integration
  1768403708745: ['L1:', 'L3:'], // Operations
  1768403708746: [], // UI Improvements - catch all
  
  // Dev mappings
  1768403708834: ['A3:'], // Compatibility
  1768403708835: ['K1:', 'K3:'], // External Integrations
  1768403708836: ['B4:', 'B6:'], // API Endpoints
  1768403708837: ['D2:'], // Environment
  1768403708838: ['E2:', 'E3:'], // PR & Deployment
  1768403708839: ['H1:', 'H2:', 'H3:'], // Deployment
  1768403708840: ['I1:', 'I3:'], // Operations
  1768403708841: ['J1:', 'J3:'], // Configuration
  1768403708842: ['Automatic', 'User Story Generation'] // Automation
};

async function remapRemaining() {
  const stories = await docClient.send(new ScanCommand({ TableName: TABLE }));
  
  const categoryIds = Object.keys(mapping).map(id => parseInt(id));
  const uxChildren = stories.Items.filter(s => 
    s.parent_id === UX_ROOT && 
    s.id !== UX_ROOT && 
    !categoryIds.includes(s.id)
  );
  const devChildren = stories.Items.filter(s => 
    s.parent_id === DEV_ROOT && 
    s.id !== DEV_ROOT && 
    !categoryIds.includes(s.id)
  );
  
  console.log(`Found ${uxChildren.length} UX children and ${devChildren.length} Dev children to remap`);
  
  for (const story of [...uxChildren, ...devChildren]) {
    let matched = false;
    
    for (const [catId, prefixes] of Object.entries(mapping)) {
      for (const prefix of prefixes) {
        if (story.title.startsWith(prefix) || story.title.includes(prefix)) {
          await docClient.send(new UpdateCommand({
            TableName: TABLE,
            Key: { id: story.id },
            UpdateExpression: 'SET parent_id = :pid',
            ExpressionAttributeValues: { ':pid': parseInt(catId) }
          }));
          console.log(`  ${story.title} → ${catId}`);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    
    if (!matched && story.parent_id === UX_ROOT) {
      // Move to UI Improvements
      await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: story.id },
        UpdateExpression: 'SET parent_id = :pid',
        ExpressionAttributeValues: { ':pid': 1768403708746 }
      }));
      console.log(`  ${story.title} → UI Improvements (1768403708746)`);
    }
  }
  
  console.log('Done!');
}

remapRemaining();
