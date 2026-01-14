import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = 'aipm-backend-prod-stories';

const VALID_CATEGORIES = {
  // UX categories
  1768403708734: 'Configuration & Environment',
  1768403708735: 'Core Features',
  1768403708736: 'UI Components',
  1768403708737: 'Setup & Bootstrap',
  1768403708738: 'Workflows',
  1768403708739: 'Testing UI',
  1768403708740: 'Security',
  1768403708741: 'CI/CD',
  1768403708742: 'Monitoring',
  1768403708743: 'Configuration Management',
  1768403708744: 'AI Integration',
  1768403708745: 'Operations',
  1768403708746: 'UI Improvements',
  // Dev categories
  1768403708834: 'Compatibility',
  1768403708835: 'External Integrations',
  1768403708836: 'API Endpoints',
  1768403708837: 'Environment',
  1768403708838: 'PR & Deployment',
  1768403708839: 'Deployment',
  1768403708840: 'Operations',
  1768403708841: 'Configuration',
  1768403708842: 'Automation'
};

const INVALID_PARENTS = [
  1768403327155, 1768403327283, 1768403327536, 1768403327925,
  1768403328000, 1768403328335, 1768403329722, 1768403330318,
  1768403331148, 1768403332481, 1768403332998, 1768403348103,
  1768403349285, 1768403350010, 1768403350824
];

async function fixOrphans() {
  const stories = await docClient.send(new ScanCommand({ TableName: TABLE }));
  
  for (const story of stories.Items) {
    if (story.parent_id && INVALID_PARENTS.includes(story.parent_id)) {
      // Find correct category based on title
      let newParent = 1768403708746; // Default to UI Improvements
      
      const title = story.title;
      if (title.startsWith('A1:') || title.startsWith('A2:')) newParent = 1768403708734;
      else if (title.startsWith('B1:') || title.startsWith('B3:') || title.startsWith('B5:')) newParent = 1768403708735;
      else if (title.match(/^C[1-6]:/)) newParent = 1768403708736;
      else if (title.startsWith('D1:') || title.startsWith('D3:')) newParent = 1768403708737;
      else if (title.startsWith('E4:')) newParent = 1768403708738;
      else if (title.match(/^F[1-3]:/)) newParent = 1768403708739;
      else if (title.match(/^G[1-4]:/)) newParent = 1768403708740;
      else if (title.startsWith('H4:')) newParent = 1768403708741;
      else if (title.startsWith('I4:')) newParent = 1768403708742;
      else if (title.startsWith('J2:')) newParent = 1768403708743;
      else if (title.startsWith('K2:')) newParent = 1768403708744;
      else if (title.startsWith('L1:') || title.startsWith('L3:')) newParent = 1768403708745;
      else if (title.startsWith('A3:')) newParent = 1768403708834;
      else if (title.startsWith('K1:') || title.startsWith('K3:')) newParent = 1768403708835;
      else if (title.startsWith('B4:') || title.startsWith('B6:')) newParent = 1768403708836;
      else if (title.startsWith('D2:')) newParent = 1768403708837;
      else if (title.startsWith('E2:') || title.startsWith('E3:')) newParent = 1768403708838;
      else if (title.match(/^H[1-3]:/)) newParent = 1768403708839;
      else if (title.startsWith('I1:') || title.startsWith('I3:')) newParent = 1768403708840;
      else if (title.startsWith('J1:') || title.startsWith('J3:')) newParent = 1768403708841;
      else if (title.includes('Automatic') || title.includes('User Story Generation')) newParent = 1768403708842;
      
      await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: story.id },
        UpdateExpression: 'SET parent_id = :pid',
        ExpressionAttributeValues: { ':pid': newParent }
      }));
      console.log(`Fixed: ${story.title} → ${VALID_CATEGORIES[newParent] || newParent}`);
    }
  }
  
  console.log('Done!');
}

fixOrphans();
