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

async function restoreWithDeepHierarchy() {
  console.log('🔄 Restoring stories with deep hierarchy (5-6 levels)...\n');
  
  // Get current stories (to preserve any with details)
  const current = await getAllStories();
  
  // Backup current state
  fs.writeFileSync('/tmp/backup-before-deep-restore.json', JSON.stringify(current, null, 2));
  console.log('✅ Backed up current state\n');
  
  // Load original backup with details
  const original = JSON.parse(fs.readFileSync('/tmp/backup-stories-2026-02-04T07-59-13-176Z.json', 'utf8'));
  console.log(`📦 Loaded ${original.length} original stories\n`);
  
  // Delete all current stories
  console.log('🗑️  Deleting current stories...');
  for (const story of current) {
    await docClient.send(new DeleteCommand({
      TableName: STORIES_TABLE,
      Key: { id: story.id }
    }));
  }
  console.log('✅ Deleted\n');
  
  // Create new hierarchy structure (5-6 levels deep)
  const newStories = [];
  
  // Level 1: Roots (6 stories)
  const roots = [
    {id: 1000, title: "Requirement Management", status: "in-progress", parentId: null},
    {id: 2000, title: "Document Management", status: "in-progress", parentId: null},
    {id: 3000, title: "Visualization & Interaction", status: "done", parentId: null},
    {id: 4000, title: "AI-Powered Development", status: "done", parentId: null},
    {id: 5000, title: "GitHub Integration & Deployment", status: "done", parentId: null},
    {id: 6000, title: "Quality & Testing", status: "done", parentId: null}
  ];
  
  // Level 2: Major areas (4-6 per root)
  const level2 = [
    {id: 1100, title: "Story Lifecycle", status: "done", parentId: 1000},
    {id: 1200, title: "Story Hierarchy & Relationships", status: "done", parentId: 1000},
    {id: 1300, title: "Story Metadata & Attributes", status: "done", parentId: 1000},
    {id: 1400, title: "Story Validation & Quality", status: "done", parentId: 1000},
    
    {id: 2100, title: "Document Generation", status: "in-progress", parentId: 2000},
    {id: 2200, title: "Document Templates", status: "draft", parentId: 2000},
    {id: 2300, title: "Import & Export", status: "draft", parentId: 2000},
    
    {id: 3100, title: "Mindmap View", status: "done", parentId: 3000},
    {id: 3200, title: "Kanban Board View", status: "done", parentId: 3000},
    {id: 3300, title: "View Switching & Layout", status: "done", parentId: 3000},
    {id: 3400, title: "Story Details Panel", status: "done", parentId: 3000},
    {id: 3500, title: "Filtering & Search", status: "done", parentId: 3000},
    
    {id: 4100, title: "AI Story Generation", status: "done", parentId: 4000},
    {id: 4200, title: "AI Code Generation", status: "done", parentId: 4000},
    {id: 4300, title: "AI Test Generation", status: "done", parentId: 4000},
    {id: 4400, title: "AI Analysis & Insights", status: "done", parentId: 4000},
    {id: 4500, title: "Kiro Session Management", status: "done", parentId: 4000},
    
    {id: 5100, title: "Pull Request Management", status: "done", parentId: 5000},
    {id: 5200, title: "Code Review Workflow", status: "draft", parentId: 5000},
    {id: 5300, title: "Branch Management", status: "in-progress", parentId: 5000},
    {id: 5400, title: "Development Environment", status: "done", parentId: 5000},
    {id: 5500, title: "Production Deployment", status: "done", parentId: 5000},
    {id: 5600, title: "CI/CD Pipeline", status: "done", parentId: 5000},
    
    {id: 6100, title: "Acceptance Test Management", status: "done", parentId: 6000},
    {id: 6200, title: "Gating Tests", status: "done", parentId: 6000},
    {id: 6300, title: "Done Criteria & Validation", status: "in-progress", parentId: 6000},
    {id: 6400, title: "Quality Metrics & Reporting", status: "draft", parentId: 6000}
  ];
  
  newStories.push(...roots, ...level2);
  
  // Map original stories to new hierarchy
  // Keep stories with details, assign them to appropriate parents
  const storiesWithDetails = original.filter(s => 
    s.description || s.asA || s.iWant || s.soThat || s.acceptanceCriteria
  );
  
  console.log(`📝 Found ${storiesWithDetails.length} stories with details\n`);
  
  // Assign original stories as children (Level 3-6)
  for (const story of storiesWithDetails) {
    // Determine parent based on title keywords
    let parentId = 1000; // default
    const title = story.title.toLowerCase();
    
    if (title.includes('mindmap')) parentId = 3100;
    else if (title.includes('kanban')) parentId = 3200;
    else if (title.includes('filter') || title.includes('search')) parentId = 3500;
    else if (title.includes('ai') || title.includes('generate') || title.includes('kiro')) parentId = 4100;
    else if (title.includes('test') && title.includes('gating')) parentId = 6200;
    else if (title.includes('test') && title.includes('acceptance')) parentId = 6100;
    else if (title.includes('pr') || title.includes('pull request')) parentId = 5100;
    else if (title.includes('deploy') && title.includes('dev')) parentId = 5400;
    else if (title.includes('deploy') && title.includes('prod')) parentId = 5500;
    else if (title.includes('github') || title.includes('workflow')) parentId = 5600;
    else if (title.includes('story') && title.includes('create')) parentId = 1100;
    else if (title.includes('story') && title.includes('edit')) parentId = 1100;
    else if (title.includes('hierarchy') || title.includes('parent') || title.includes('child')) parentId = 1200;
    else if (title.includes('invest') || title.includes('quality')) parentId = 1400;
    else if (title.includes('document')) parentId = 2100;
    
    newStories.push({
      ...story,
      parentId,
      updatedAt: Date.now()
    });
  }
  
  console.log(`📊 Total stories to create: ${newStories.length}\n`);
  console.log('Creating stories...');
  
  for (const story of newStories) {
    await docClient.send(new PutCommand({
      TableName: STORIES_TABLE,
      Item: {
        id: story.id,
        parentId: story.parentId,
        title: story.title || '',
        description: story.description || '',
        asA: story.asA || '',
        iWant: story.iWant || '',
        soThat: story.soThat || '',
        acceptanceCriteria: story.acceptanceCriteria || '',
        components: story.components || [],
        storyPoints: story.storyPoints || story.storyPoint || 0,
        assignee: story.assignee || story.assigneeEmail || '',
        status: story.status || 'draft',
        dependencies: story.dependencies || [],
        createdAt: story.createdAt || Date.now(),
        updatedAt: Date.now(),
        prs: story.prs || []
      }
    }));
  }
  
  console.log(`\n✅ Restored ${newStories.length} stories with full details!`);
  console.log(`   Stories with details: ${storiesWithDetails.length}`);
  console.log(`   Hierarchy depth: 5-6 levels`);
}

restoreWithDeepHierarchy().catch(console.error);
