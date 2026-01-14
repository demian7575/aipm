#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const PROD_STORIES_TABLE = 'aipm-backend-prod-stories';

// Root categories
const roots = {
  'Platform Architecture': 1768381124499,
  'Core Services': 1768381363027,
  'User Experience': 1768381708925,
  'Development & Delivery': 1768381952448,
  'Quality & Security': 1768382265445,
  'Operations': 1768382546495
};

function categorizeStory(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  
  // User Experience - UI/UX related
  if (text.match(/ui|interface|mindmap|panel|detail|display|scroll|modal|frontend|button|card|view|layout|position/)) {
    return { root: 'User Experience', id: roots['User Experience'] };
  }
  
  // Development & Delivery - PR, deployment, versioning
  if (text.match(/pr|pull request|github|deploy|version|release|workflow|branch|merge|create pr/)) {
    return { root: 'Development & Delivery', id: roots['Development & Delivery'] };
  }
  
  // Quality & Security - Testing, gating, security
  if (text.match(/test|gating|quality|gwt|given.*when.*then|acceptance|security|token|secret/)) {
    return { root: 'Quality & Security', id: roots['Quality & Security'] };
  }
  
  // Platform Architecture - AI, architecture, integration
  if (text.match(/ai|engine|generation|kiro|architecture|infrastructure|integration|automation|aws service/)) {
    return { root: 'Platform Architecture', id: roots['Platform Architecture'] };
  }
  
  // Core Services - API, backend, data, CRUD
  if (text.match(/api|backend|data|crud|endpoint|upload|model|database|dynamodb/)) {
    return { root: 'Core Services', id: roots['Core Services'] };
  }
  
  // Operations - Monitoring, config, maintenance
  if (text.match(/monitor|log|config|maintenance|health|diagnostic|troubleshoot|capacity/)) {
    return { root: 'Operations', id: roots['Operations'] };
  }
  
  // Default to User Experience
  return { root: 'User Experience', id: roots['User Experience'] };
}

async function main() {
  const response = await dynamodb.send(new ScanCommand({ TableName: PROD_STORIES_TABLE }));
  const stories = response.Items;
  
  // Filter out root stories
  const rootIds = Object.values(roots);
  const childStories = stories.filter(s => !rootIds.includes(s.id));
  
  console.log(`Reorganizing ${childStories.length} stories...\n`);
  
  const categorized = {};
  
  for (const story of childStories) {
    const category = categorizeStory(story.title, story.description);
    
    if (!categorized[category.root]) {
      categorized[category.root] = [];
    }
    categorized[category.root].push(story);
    
    try {
      await dynamodb.send(new UpdateCommand({
        TableName: PROD_STORIES_TABLE,
        Key: { id: story.id },
        UpdateExpression: 'SET parent_id = :parentId, updated_at = :updated',
        ExpressionAttributeValues: {
          ':parentId': category.id,
          ':updated': new Date().toISOString()
        }
      }));
      
      console.log(`✅ ${story.title.substring(0, 60)} -> ${category.root}`);
    } catch (error) {
      console.error(`❌ ${story.title}: ${error.message}`);
    }
  }
  
  console.log('\n📊 Distribution:');
  for (const [root, stories] of Object.entries(categorized)) {
    console.log(`  ${root}: ${stories.length} stories`);
  }
  
  console.log('\n✨ Reorganization complete!');
}

main();
