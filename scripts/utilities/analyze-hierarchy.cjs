#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

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

function buildTree(stories) {
  const byId = new Map(stories.map(s => [s.id, {...s, children: []}]));
  const roots = [];
  
  stories.forEach(s => {
    const story = byId.get(s.id);
    if (s.parentId && byId.has(s.parentId)) {
      byId.get(s.parentId).children.push(story);
    } else if (!s.parentId) {
      roots.push(story);
    }
  });
  
  return { roots, byId };
}

function printTree(story, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${story.id} - ${story.title} (${story.children.length} children)`);
  story.children.forEach(child => printTree(child, depth + 1));
}

async function reorganize() {
  console.log('📊 Analyzing current hierarchy...\n');
  
  const stories = await getAllStories();
  const { roots } = buildTree(stories);
  
  console.log(`Total stories: ${stories.length}\n`);
  
  roots.forEach(root => {
    console.log(`\n=== ${root.title} ===`);
    printTree(root);
  });
  
  // Find stories with >7 children
  const overloaded = stories.filter(s => {
    const story = buildTree(stories).byId.get(s.id);
    return story.children.length > 7;
  });
  
  console.log(`\n\n⚠️  Stories with >7 children: ${overloaded.length}`);
  overloaded.forEach(s => {
    const story = buildTree(stories).byId.get(s.id);
    console.log(`  ${s.id} - ${s.title}: ${story.children.length} children`);
  });
}

reorganize().catch(console.error);
