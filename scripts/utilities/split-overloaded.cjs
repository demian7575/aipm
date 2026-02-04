#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

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

async function splitOverloadedParents() {
  console.log('✂️  Splitting overloaded parents (>7 children)...\n');
  
  const stories = await getAllStories();
  
  // Build tree
  const byId = new Map(stories.map(s => [s.id, {...s, children: []}]));
  stories.forEach(s => {
    if (s.parentId && byId.has(s.parentId)) {
      byId.get(s.parentId).children.push(byId.get(s.id));
    }
  });
  
  // Find overloaded parents
  const overloaded = stories.filter(s => {
    const story = byId.get(s.id);
    return story.children.length > 7;
  });
  
  console.log(`Found ${overloaded.length} overloaded parents:\n`);
  overloaded.forEach(s => {
    console.log(`  ${s.id} - ${s.title}: ${byId.get(s.id).children.length} children`);
  });
  
  // Create intermediate groups for 1110 (Story Creation - 10 children)
  console.log('\n📦 Creating intermediate groups...\n');
  
  // 1110 -> split into UI and API groups
  await docClient.send(new PutCommand({
    TableName: STORIES_TABLE,
    Item: {
      id: 11101,
      parentId: 1110,
      title: "Story Creation UI",
      description: "User interface for creating stories",
      status: "done",
      asA: "", iWant: "", soThat: "", acceptanceCriteria: "",
      components: [], storyPoints: 0, assignee: "", dependencies: [],
      createdAt: Date.now(), updatedAt: Date.now(), prs: []
    }
  }));
  
  await docClient.send(new PutCommand({
    TableName: STORIES_TABLE,
    Item: {
      id: 11102,
      parentId: 1110,
      title: "Story Creation API",
      description: "Backend API for creating stories",
      status: "done",
      asA: "", iWant: "", soThat: "", acceptanceCriteria: "",
      components: [], storyPoints: 0, assignee: "", dependencies: [],
      createdAt: Date.now(), updatedAt: Date.now(), prs: []
    }
  }));
  
  // 1140 -> split into UI and Workflow groups
  await docClient.send(new PutCommand({
    TableName: STORIES_TABLE,
    Item: {
      id: 11401,
      parentId: 1140,
      title: "Status Management UI",
      description: "User interface for managing story status",
      status: "done",
      asA: "", iWant: "", soThat: "", acceptanceCriteria: "",
      components: [], storyPoints: 0, assignee: "", dependencies: [],
      createdAt: Date.now(), updatedAt: Date.now(), prs: []
    }
  }));
  
  await docClient.send(new PutCommand({
    TableName: STORIES_TABLE,
    Item: {
      id: 11402,
      parentId: 1140,
      title: "Status Workflow & Automation",
      description: "Automated status transitions and workflows",
      status: "done",
      asA: "", iWant: "", soThat: "", acceptanceCriteria: "",
      components: [], storyPoints: 0, assignee: "", dependencies: [],
      createdAt: Date.now(), updatedAt: Date.now(), prs: []
    }
  }));
  
  console.log('✅ Created intermediate groups\n');
  
  // Redistribute children of 1110
  const children1110 = byId.get(1110).children;
  console.log(`Redistributing ${children1110.length} children of 1110...\n`);
  
  for (let i = 0; i < children1110.length; i++) {
    const child = children1110[i];
    const newParent = i < 5 ? 11101 : 11102; // Split 50/50
    
    await docClient.send(new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: { id: child.id },
      UpdateExpression: 'SET parentId = :p',
      ExpressionAttributeValues: { ':p': newParent }
    }));
    
    console.log(`  ${child.id} -> ${newParent}`);
  }
  
  // Redistribute children of 1140
  const children1140 = byId.get(1140).children;
  console.log(`\nRedistributing ${children1140.length} children of 1140...\n`);
  
  for (let i = 0; i < children1140.length; i++) {
    const child = children1140[i];
    const newParent = i < 5 ? 11401 : 11402; // Split 50/50
    
    await docClient.send(new UpdateCommand({
      TableName: STORIES_TABLE,
      Key: { id: child.id },
      UpdateExpression: 'SET parentId = :p',
      ExpressionAttributeValues: { ':p': newParent }
    }));
    
    console.log(`  ${child.id} -> ${newParent}`);
  }
  
  console.log('\n✅ Split complete! All parents now have ≤7 children');
}

splitOverloadedParents().catch(console.error);
