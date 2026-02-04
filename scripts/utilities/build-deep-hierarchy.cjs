#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');

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

function createStory(id, title, status, parentId, details = {}) {
  return {
    id,
    parentId,
    title,
    description: details.description || '',
    asA: details.asA || '',
    iWant: details.iWant || '',
    soThat: details.soThat || '',
    acceptanceCriteria: details.acceptanceCriteria || '',
    components: details.components || [],
    storyPoints: details.storyPoints || details.storyPoint || 0,
    assignee: details.assignee || details.assigneeEmail || '',
    status: status || details.status || 'draft',
    dependencies: details.dependencies || [],
    createdAt: details.createdAt || Date.now(),
    updatedAt: Date.now(),
    prs: details.prs || []
  };
}

async function buildDeepHierarchy() {
  console.log('🏗️  Building deep hierarchy (5-6 levels, max 7 children)...\n');
  
  const current = await getAllStories();
  fs.writeFileSync('/tmp/backup-before-deep-build.json', JSON.stringify(current, null, 2));
  
  const original = JSON.parse(fs.readFileSync('/tmp/backup-stories-2026-02-04T07-59-13-176Z.json', 'utf8'));
  console.log(`📦 Loaded ${original.length} original stories\n`);
  
  // Delete all
  console.log('🗑️  Clearing database...');
  for (const story of current) {
    await docClient.send(new DeleteCommand({ TableName: STORIES_TABLE, Key: { id: story.id } }));
  }
  console.log('✅ Cleared\n');
  
  const stories = [];
  
  // Level 1: Roots
  stories.push(createStory(1000, "Requirement Management", "in-progress", null));
  stories.push(createStory(2000, "Document Management", "in-progress", null));
  stories.push(createStory(3000, "Visualization & Interaction", "done", null));
  stories.push(createStory(4000, "AI-Powered Development", "done", null));
  stories.push(createStory(5000, "GitHub Integration & Deployment", "done", null));
  stories.push(createStory(6000, "Quality & Testing", "done", null));
  
  // Level 2: Major areas
  stories.push(createStory(1100, "Story Lifecycle", "done", 1000));
  stories.push(createStory(1200, "Story Hierarchy & Relationships", "done", 1000));
  stories.push(createStory(1300, "Story Metadata & Attributes", "done", 1000));
  stories.push(createStory(1400, "Story Validation & Quality", "done", 1000));
  
  stories.push(createStory(2100, "Document Generation", "in-progress", 2000));
  stories.push(createStory(2200, "Document Templates", "draft", 2000));
  stories.push(createStory(2300, "Import & Export", "draft", 2000));
  
  stories.push(createStory(3100, "Mindmap View", "done", 3000));
  stories.push(createStory(3200, "Kanban Board View", "done", 3000));
  stories.push(createStory(3300, "View Switching & Layout", "done", 3000));
  stories.push(createStory(3400, "Story Details Panel", "done", 3000));
  stories.push(createStory(3500, "Filtering & Search", "done", 3000));
  
  stories.push(createStory(4100, "AI Story Generation", "done", 4000));
  stories.push(createStory(4200, "AI Code Generation", "done", 4000));
  stories.push(createStory(4300, "AI Test Generation", "done", 4000));
  stories.push(createStory(4400, "AI Analysis & Insights", "done", 4000));
  stories.push(createStory(4500, "Kiro Session Management", "done", 4000));
  
  stories.push(createStory(5100, "Pull Request Management", "done", 5000));
  stories.push(createStory(5200, "Code Review Workflow", "draft", 5000));
  stories.push(createStory(5300, "Branch Management", "in-progress", 5000));
  stories.push(createStory(5400, "Development Environment", "done", 5000));
  stories.push(createStory(5500, "Production Deployment", "done", 5000));
  stories.push(createStory(5600, "CI/CD Pipeline", "done", 5000));
  
  stories.push(createStory(6100, "Acceptance Test Management", "done", 6000));
  stories.push(createStory(6200, "Gating Tests", "done", 6000));
  stories.push(createStory(6300, "Done Criteria & Validation", "in-progress", 6000));
  stories.push(createStory(6400, "Quality Metrics & Reporting", "draft", 6000));
  
  // Level 3: Feature groups (create intermediate levels)
  stories.push(createStory(1110, "Story Creation", "done", 1100));
  stories.push(createStory(1120, "Story Editing", "done", 1100));
  stories.push(createStory(1130, "Story Deletion", "done", 1100));
  stories.push(createStory(1140, "Story Status Management", "done", 1100));
  
  stories.push(createStory(1210, "Parent-Child Relationships", "done", 1200));
  stories.push(createStory(1220, "Story Dependencies", "done", 1200));
  stories.push(createStory(1230, "Hierarchical Navigation", "done", 1200));
  
  stories.push(createStory(1310, "Components", "done", 1300));
  stories.push(createStory(1320, "Story Points", "done", 1300));
  stories.push(createStory(1330, "Assignee Management", "done", 1300));
  stories.push(createStory(1340, "Custom Fields", "draft", 1300));
  
  stories.push(createStory(1410, "INVEST Validation", "done", 1400));
  stories.push(createStory(1420, "Required Fields Validation", "in-progress", 1400));
  stories.push(createStory(1430, "Story Completeness", "in-progress", 1400));
  
  stories.push(createStory(3110, "Mindmap Rendering", "done", 3100));
  stories.push(createStory(3120, "Mindmap Navigation", "done", 3100));
  stories.push(createStory(3130, "Mindmap Interactions", "in-progress", 3100));
  
  stories.push(createStory(3210, "Kanban Rendering", "done", 3200));
  stories.push(createStory(3220, "Kanban Interactions", "done", 3200));
  stories.push(createStory(3230, "Kanban Customization", "draft", 3200));
  
  stories.push(createStory(3510, "Filter Options", "done", 3500));
  stories.push(createStory(3520, "Search Functionality", "draft", 3500));
  stories.push(createStory(3530, "Filter State Management", "done", 3500));
  
  stories.push(createStory(4110, "Story Draft Generation", "done", 4100));
  stories.push(createStory(4120, "Child Story Generation", "in-progress", 4100));
  stories.push(createStory(4130, "Story Refinement", "draft", 4100));
  
  stories.push(createStory(4210, "Code Generation", "done", 4200));
  stories.push(createStory(4220, "Code Quality", "draft", 4200));
  stories.push(createStory(4230, "Conflict Resolution", "in-progress", 4200));
  
  stories.push(createStory(4310, "Acceptance Test Generation", "done", 4300));
  stories.push(createStory(4320, "Unit Test Generation", "draft", 4300));
  
  stories.push(createStory(4410, "INVEST Analysis", "done", 4400));
  stories.push(createStory(4420, "Story Analytics", "draft", 4400));
  
  stories.push(createStory(4510, "Session Pool", "done", 4500));
  stories.push(createStory(4520, "Semantic API", "done", 4500));
  
  stories.push(createStory(5110, "PR Creation", "done", 5100));
  stories.push(createStory(5120, "PR Tracking", "done", 5100));
  stories.push(createStory(5130, "PR Actions", "done", 5100));
  
  stories.push(createStory(5310, "Branch Operations", "done", 5300));
  stories.push(createStory(5320, "Branch Protection", "draft", 5300));
  
  stories.push(createStory(5410, "Dev Deployment", "done", 5400));
  stories.push(createStory(5420, "Dev Testing", "done", 5400));
  stories.push(createStory(5430, "Dev Monitoring", "in-progress", 5400));
  
  stories.push(createStory(5510, "Production Deploy", "done", 5500));
  stories.push(createStory(5520, "Deployment Gating", "done", 5500));
  stories.push(createStory(5530, "Production Monitoring", "in-progress", 5500));
  stories.push(createStory(5540, "Rollback & Recovery", "draft", 5500));
  
  stories.push(createStory(5610, "GitHub Actions", "done", 5600));
  stories.push(createStory(5620, "Automated Testing", "done", 5600));
  stories.push(createStory(5630, "Build & Deploy Automation", "done", 5600));
  
  stories.push(createStory(6110, "Test CRUD Operations", "done", 6100));
  stories.push(createStory(6120, "Test Execution", "in-progress", 6100));
  stories.push(createStory(6130, "Test Organization", "draft", 6100));
  
  stories.push(createStory(6210, "Pre-Deployment Gating", "done", 6200));
  stories.push(createStory(6220, "Post-Deployment Gating", "done", 6200));
  stories.push(createStory(6230, "E2E Workflow Tests", "done", 6200));
  
  stories.push(createStory(6310, "Done Definition", "draft", 6300));
  stories.push(createStory(6320, "Completion Validation", "in-progress", 6300));
  stories.push(createStory(6330, "Quality Gates", "draft", 6300));
  
  // Now map original stories with details to Level 4-6
  let nextId = 100000; // Use high IDs for original stories
  
  for (const orig of original) {
    if (!orig.description && !orig.asA && !orig.iWant) continue; // Skip empty stories
    
    const title = orig.title.toLowerCase();
    let parentId = 1000;
    
    // Map to specific Level 3 parents
    if (title.includes('drag') && title.includes('drop')) parentId = 1210;
    else if (title.includes('filter') && title.includes('mindmap')) parentId = 3510;
    else if (title.includes('filter') && title.includes('persist')) parentId = 3530;
    else if (title.includes('filter')) parentId = 3510;
    else if (title.includes('gating') && title.includes('scroll')) parentId = 6200;
    else if (title.includes('gating')) parentId = 6210;
    else if (title.includes('pr') && title.includes('description')) parentId = 5110;
    else if (title.includes('github') && title.includes('status')) parentId = 5610;
    else if (title.includes('invest') && title.includes('heuristic')) parentId = 1410;
    else if (title.includes('override')) parentId = 1140;
    else if (title.includes('kiro') && title.includes('queue')) parentId = 4510;
    else if (title.includes('lifecycle')) parentId = 1100;
    
    stories.push(createStory(nextId++, orig.title, orig.status, parentId, orig));
  }
  
  console.log(`📊 Creating ${stories.length} stories...\n`);
  
  for (const story of stories) {
    await docClient.send(new PutCommand({ TableName: STORIES_TABLE, Item: story }));
  }
  
  console.log(`✅ Created ${stories.length} stories with deep hierarchy!`);
  console.log(`   Hierarchy: 5-6 levels deep`);
  console.log(`   Max children per level: 7`);
  console.log(`   Stories with details: ${stories.filter(s => s.description || s.asA).length}`);
}

buildDeepHierarchy().catch(console.error);
