#!/usr/bin/env node

import { readFileSync } from 'fs';

const API_URL = 'http://44.220.45.57';

// Current 6 root IDs in production
const roots = {
  'Platform Architecture': 1768381124499,
  'Core Services': 1768381363027,
  'User Experience': 1768381708925,
  'Development & Delivery': 1768381952448,
  'Quality & Security': 1768382265445,
  'Operations': 1768382546495
};

// Map old stories to new roots based on their content
function categorizeStory(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.match(/ui|interface|mindmap|panel|details|display|scroll|modal|frontend/)) {
    return roots['User Experience'];
  }
  if (text.match(/pr|github|deploy|version|release|workflow/)) {
    return roots['Development & Delivery'];
  }
  if (text.match(/test|gating|quality|gwt/)) {
    return roots['Quality & Security'];
  }
  if (text.match(/ai|engine|generation|kiro/)) {
    return roots['Platform Architecture'];
  }
  if (text.match(/api|backend|data|crud/)) {
    return roots['Core Services'];
  }
  
  // Default to User Experience for UI-related stories
  return roots['User Experience'];
}

function parseDevStory(item) {
  return {
    id: item.id?.N,
    title: item.title?.S || '',
    description: item.description?.S || '',
    asA: item.as_a?.S || item.asA?.S || 'user',
    iWant: item.i_want?.S || item.iWant?.S || '',
    soThat: item.so_that?.S || item.soThat?.S || '',
    components: JSON.parse(item.components?.S || '["WorkModel"]'),
    storyPoint: parseInt(item.story_point?.N || item.storyPoint?.N || '0'),
    assigneeEmail: item.assignee_email?.S || item.assigneeEmail?.S || '',
    status: item.status?.S || 'Draft',
    parentId: item.parent_id?.N || item.parentId?.N || null
  };
}

async function createStory(story, newParentId) {
  const payload = {
    title: story.title,
    description: story.description,
    asA: story.asA,
    iWant: story.iWant,
    soThat: story.soThat,
    components: Array.isArray(story.components) ? story.components : ['WorkModel'],
    storyPoint: story.storyPoint,
    assigneeEmail: story.assigneeEmail,
    status: story.status,
    parentId: newParentId,
    acceptWarnings: true
  };
  
  const response = await fetch(`${API_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text.substring(0, 100)}`);
  }
  
  return await response.json();
}

async function main() {
  const devData = JSON.parse(readFileSync('/tmp/dev-stories.json', 'utf-8'));
  const devStories = devData.Items.map(parseDevStory);
  
  // Filter out root stories and organize by parent
  const rootStories = devStories.filter(s => !s.parentId || s.parentId === 'null');
  const childStories = devStories.filter(s => s.parentId && s.parentId !== 'null');
  
  console.log(`Found ${rootStories.length} root stories and ${childStories.length} child stories\n`);
  
  // Map old IDs to new IDs
  const idMap = {};
  
  // Import root stories first
  for (const story of rootStories) {
    const newParentId = categorizeStory(story.title, story.description);
    
    try {
      const created = await createStory(story, newParentId);
      idMap[story.id] = created.id;
      console.log(`✅ ${story.title.substring(0, 60)} [${story.status}]`);
    } catch (error) {
      console.error(`❌ ${story.title.substring(0, 60)}: ${error.message}`);
    }
  }
  
  // Import child stories
  for (const story of childStories) {
    const newParentId = idMap[story.parentId] || categorizeStory(story.title, story.description);
    
    try {
      const created = await createStory(story, newParentId);
      idMap[story.id] = created.id;
      console.log(`  ↳ ${story.title.substring(0, 60)} [${story.status}]`);
    } catch (error) {
      console.error(`  ❌ ${story.title.substring(0, 60)}: ${error.message}`);
    }
  }
  
  console.log(`\n✨ Imported ${Object.keys(idMap).length} stories from dev`);
}

main();
