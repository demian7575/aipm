#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
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

async function reorganize() {
  console.log('🔄 Reorganizing hierarchy...\n');
  
  const stories = await getAllStories();
  
  // Backup
  fs.writeFileSync('/tmp/backup-before-reorg.json', JSON.stringify(stories, null, 2));
  console.log('✅ Backup saved\n');
  
  // Group stories by root
  const byRoot = {
    1000: stories.filter(s => s.parentId === 1000 || s.id === 1000),
    2000: stories.filter(s => s.parentId === 2000 || s.id === 2000),
    3000: stories.filter(s => s.parentId === 3000 || s.id === 3000),
    4000: stories.filter(s => s.parentId === 4000 || s.id === 4000),
    5000: stories.filter(s => s.parentId === 5000 || s.id === 5000),
    6000: stories.filter(s => s.parentId === 6000 || s.id === 6000)
  };
  
  // Keep existing well-structured stories (1100-1400, 2100-2300, etc.)
  const wellStructured = stories.filter(s => 
    (s.id >= 1100 && s.id < 1500) ||
    (s.id >= 2100 && s.id < 2400) ||
    (s.id >= 3100 && s.id < 3600) ||
    (s.id >= 4100 && s.id < 4600) ||
    (s.id >= 5100 && s.id < 5700) ||
    (s.id >= 6100 && s.id < 6500)
  );
  
  console.log(`Well-structured stories: ${wellStructured.length}`);
  console.log(`Stories to reorganize: ${stories.length - wellStructured.length - 6}\n`);
  
  // Move orphaned children under 1000 to proper parents
  const updates = [];
  
  // Stories under 1000 that should be elsewhere
  const moveToAI = [4110, 4510, 42101, 4100, 4130, 4230, 4520, 45102, 45103, 4410, 41102, 4210, 42301, 41104, 45104, 45101, 44102, 4120, 4420, 45201, 45202];
  const moveToGitHub = [56102, 5600, 5100, 56301, 5310, 5430, 51204, 53101, 56103, 54301, 54103, 53103, 53104, 56101, 5400, 5300, 5540, 51101, 51104, 51102];
  const moveToQuality = [6300, 62202, 6320, 62103, 62203, 61301, 62302, 63202, 6310, 6420];
  const moveToVisualization = [3500, 3520, 35101, 35102, 35303, 35302, 3530, 35103, 3510, 3420, 34201, 34202, 34104];
  
  moveToAI.forEach(id => {
    const story = stories.find(s => s.id === id);
    if (story && story.parentId === 1000) {
      updates.push({...story, parentId: 4000, updatedAt: Date.now()});
    }
  });
  
  moveToGitHub.forEach(id => {
    const story = stories.find(s => s.id === id);
    if (story && story.parentId === 1000) {
      updates.push({...story, parentId: 5000, updatedAt: Date.now()});
    }
  });
  
  moveToQuality.forEach(id => {
    const story = stories.find(s => s.id === id);
    if (story && story.parentId === 1000) {
      updates.push({...story, parentId: 6000, updatedAt: Date.now()});
    }
  });
  
  moveToVisualization.forEach(id => {
    const story = stories.find(s => s.id === id);
    if (story && story.parentId === 1000) {
      updates.push({...story, parentId: 3000, updatedAt: Date.now()});
    }
  });
  
  console.log(`Moving ${updates.length} stories to correct parents...\n`);
  
  for (const story of updates) {
    await docClient.send(new PutCommand({
      TableName: STORIES_TABLE,
      Item: story
    }));
    console.log(`✅ Moved ${story.id} - ${story.title} to ${story.parentId}`);
  }
  
  console.log('\n✅ Reorganization complete!');
}

reorganize().catch(console.error);
