#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const STORIES_TABLE = 'aipm-backend-prod-stories';

async function getAllStories() {
  let items = [];
  let lastKey;
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: STORIES_TABLE,
      ExclusiveStartKey: lastKey
    }));
    items = items.concat(result.Items || []);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

function findBestParent(story) {
  const title = story.title.toLowerCase();
  const desc = (story.description || '').toLowerCase();
  const combined = title + ' ' + desc;
  
  // Story Lifecycle (1100)
  if (combined.match(/\b(create|add|new)\b.*\bstory\b/)) return 1110; // Story Creation
  if (combined.match(/\b(edit|update|modify|change)\b.*\bstory\b/)) return 1120; // Story Editing
  if (combined.match(/\b(delete|remove)\b.*\bstory\b/)) return 1130; // Story Deletion
  if (combined.match(/\b(status|state|workflow)\b/)) return 1140; // Story Status Management
  
  // Story Hierarchy (1200)
  if (combined.match(/\b(drag|drop|move|parent|child|hierarchy)\b/)) return 1210; // Parent-Child
  if (combined.match(/\b(depend|block|relationship)\b/)) return 1220; // Dependencies
  if (combined.match(/\b(navigate|breadcrumb|expand|collapse)\b/)) return 1230; // Navigation
  
  // Story Metadata (1300)
  if (combined.match(/\b(component|tag)\b/)) return 1310; // Components
  if (combined.match(/\b(point|estimate|fibonacci)\b/)) return 1320; // Story Points
  if (combined.match(/\b(assign|owner|user)\b/)) return 1330; // Assignee
  if (combined.match(/\b(custom|field|metadata)\b/)) return 1340; // Custom Fields
  
  // Story Validation (1400)
  if (combined.match(/\binvest\b/)) return 1410; // INVEST Validation
  if (combined.match(/\b(validate|required|field)\b/)) return 1420; // Required Fields
  if (combined.match(/\b(complete|done|criteria)\b/)) return 1430; // Completeness
  
  // Document Management (2000)
  if (combined.match(/\b(document|report|generate)\b/)) return 2100; // Document Generation
  if (combined.match(/\b(template)\b/)) return 2200; // Templates
  if (combined.match(/\b(import|export|backup)\b/)) return 2300; // Import/Export
  
  // Mindmap (3100)
  if (combined.match(/\bmindmap\b.*\b(render|display|show|node)\b/)) return 3110; // Mindmap Rendering
  if (combined.match(/\bmindmap\b.*\b(zoom|pan|click|navigate)\b/)) return 3120; // Mindmap Navigation
  if (combined.match(/\bmindmap\b.*\b(drag|interact)\b/)) return 3130; // Mindmap Interactions
  
  // Kanban (3200)
  if (combined.match(/\bkanban\b.*\b(render|column|card)\b/)) return 3210; // Kanban Rendering
  if (combined.match(/\bkanban\b.*\b(drag|drop|move)\b/)) return 3220; // Kanban Interactions
  if (combined.match(/\bkanban\b.*\b(custom|config)\b/)) return 3230; // Kanban Customization
  
  // Filtering & Search (3500)
  if (combined.match(/\bfilter\b/)) return 3510; // Filter Options
  if (combined.match(/\bsearch\b/)) return 3520; // Search
  if (combined.match(/\bpersist\b.*\bfilter\b/)) return 3530; // Filter State
  
  // AI Story Generation (4100)
  if (combined.match(/\bai\b.*\b(generate|draft)\b.*\bstory\b/)) return 4110; // Story Draft
  if (combined.match(/\bai\b.*\bchild\b/)) return 4120; // Child Story Generation
  if (combined.match(/\bai\b.*\b(refine|improve)\b/)) return 4130; // Story Refinement
  
  // AI Code Generation (4200)
  if (combined.match(/\b(code|generate)\b.*\b(from|story)\b/)) return 4210; // Code Generation
  if (combined.match(/\b(quality|lint|review)\b/)) return 4220; // Code Quality
  if (combined.match(/\b(conflict|merge)\b/)) return 4230; // Conflict Resolution
  
  // AI Test Generation (4300)
  if (combined.match(/\bai\b.*\b(test|given|when|then)\b/)) return 4310; // Acceptance Test Gen
  if (combined.match(/\bunit\b.*\btest\b/)) return 4320; // Unit Test Gen
  
  // AI Analysis (4400)
  if (combined.match(/\binvest\b.*\b(analysis|score)\b/)) return 4410; // INVEST Analysis
  if (combined.match(/\b(analytics|metrics|insight)\b/)) return 4420; // Story Analytics
  
  // Kiro Session (4500)
  if (combined.match(/\b(kiro|session|pool)\b/)) return 4510; // Session Pool
  if (combined.match(/\bsemantic\b.*\bapi\b/)) return 4520; // Semantic API
  
  // PR Management (5100)
  if (combined.match(/\bpr\b.*\b(create|new)\b/)) return 5110; // PR Creation
  if (combined.match(/\bpr\b.*\b(track|status|check)\b/)) return 5120; // PR Tracking
  if (combined.match(/\bpr\b.*\b(merge|close|action)\b/)) return 5130; // PR Actions
  
  // Branch Management (5300)
  if (combined.match(/\bbranch\b.*\b(create|delete|rebase)\b/)) return 5310; // Branch Operations
  if (combined.match(/\bbranch\b.*\b(protect|rule)\b/)) return 5320; // Branch Protection
  
  // Dev Environment (5400)
  if (combined.match(/\bdev\b.*\b(deploy|environment)\b/)) return 5410; // Dev Deployment
  if (combined.match(/\bdev\b.*\btest\b/)) return 5420; // Dev Testing
  if (combined.match(/\bdev\b.*\b(monitor|health)\b/)) return 5430; // Dev Monitoring
  
  // Production Deployment (5500)
  if (combined.match(/\bprod\b.*\bdeploy\b/)) return 5510; // Production Deploy
  if (combined.match(/\bgating\b.*\btest\b/)) return 5520; // Deployment Gating
  if (combined.match(/\bprod\b.*\bmonitor\b/)) return 5530; // Production Monitoring
  if (combined.match(/\b(rollback|recovery)\b/)) return 5540; // Rollback
  
  // CI/CD Pipeline (5600)
  if (combined.match(/\b(github|workflow|action)\b/)) return 5610; // GitHub Actions
  if (combined.match(/\bautomated\b.*\btest\b/)) return 5620; // Automated Testing
  if (combined.match(/\b(build|deploy)\b.*\bautomation\b/)) return 5630; // Build & Deploy
  
  // Acceptance Test Management (6100)
  if (combined.match(/\btest\b.*\b(create|edit|delete)\b/)) return 6110; // Test CRUD
  if (combined.match(/\btest\b.*\b(execute|run|pass|fail)\b/)) return 6120; // Test Execution
  if (combined.match(/\btest\b.*\b(organize|group)\b/)) return 6130; // Test Organization
  
  // Gating Tests (6200)
  if (combined.match(/\bgating\b.*\b(pre|before)\b/)) return 6210; // Pre-Deployment Gating
  if (combined.match(/\bgating\b.*\b(post|after)\b/)) return 6220; // Post-Deployment Gating
  if (combined.match(/\be2e\b|\bend.to.end\b/)) return 6230; // E2E Workflow Tests
  
  // Done Criteria (6300)
  if (combined.match(/\bdone\b.*\b(definition|criteria)\b/)) return 6310; // Done Definition
  if (combined.match(/\b(validation|complete)\b/)) return 6320; // Completion Validation
  if (combined.match(/\bquality\b.*\bgate\b/)) return 6330; // Quality Gates
  
  // Default to Level 2 based on root category
  if (combined.match(/\bstory\b/)) return 1100;
  if (combined.match(/\bdocument\b/)) return 2100;
  if (combined.match(/\bview\b|\bui\b/)) return 3100;
  if (combined.match(/\bai\b/)) return 4100;
  if (combined.match(/\bgithub\b|\bdeploy\b/)) return 5100;
  if (combined.match(/\btest\b/)) return 6100;
  
  return 1100; // Default fallback
}

async function redistribute() {
  console.log('🔄 Redistributing stories to proper parents...\n');
  
  const stories = await getAllStories();
  
  // Find stories that are direct children of roots (should be deeper)
  const toRedistribute = stories.filter(s => 
    [1000, 2000, 3000, 4000, 5000, 6000].includes(s.parentId) &&
    s.id >= 100000 // Original stories with details
  );
  
  console.log(`📊 Found ${toRedistribute.length} stories to redistribute\n`);
  
  for (const story of toRedistribute) {
    const newParent = findBestParent(story);
    
    await docClient.send(new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: { id: story.id },
      UpdateExpression: 'SET parentId = :p',
      ExpressionAttributeValues: { ':p': newParent }
    }));
    
    console.log(`✅ ${story.id} - ${story.title.substring(0, 50)} -> ${newParent}`);
  }
  
  console.log(`\n✅ Redistributed ${toRedistribute.length} stories!`);
}

redistribute().catch(console.error);
