#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = process.env.API_BASE || 'http://44.197.204.18:4000';

// Parse FULL_REQUIREMENTS.md
const reqFile = join(__dirname, '../../docs/FULL_REQUIREMENTS.md');
const content = readFileSync(reqFile, 'utf-8');

const stories = [];
let currentEpic = null;
let currentStory = null;

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Epic header: ## Epic N — Title (count)
  if (line.startsWith('## Epic ')) {
    const match = line.match(/## Epic (\d+) — (.+?) \((\d+)\)/);
    if (match) {
      currentEpic = {
        number: parseInt(match[1]),
        title: match[2].trim(),
        count: parseInt(match[3])
      };
    }
  }
  
  // Story header: **US-XXX-NNN — Title**
  else if (line.startsWith('**US-')) {
    if (currentStory) {
      stories.push(currentStory);
    }
    
    const match = line.match(/\*\*US-([A-Z]+)-(\d+) — (.+?)\*\*/);
    if (match) {
      currentStory = {
        epic: currentEpic,
        code: `US-${match[1]}-${match[2]}`,
        epicCode: match[1],
        number: parseInt(match[2]),
        title: match[3].trim(),
        asA: '',
        iWant: '',
        soThat: '',
        gwt: ''
      };
    }
  }
  
  // As a / I want / So that
  else if (line.startsWith('As a ') || line.startsWith('As an ')) {
    const match = line.match(/As an? (.+?), I want (.+?), so that (.+?)\./);
    if (match && currentStory) {
      currentStory.asA = match[1].trim();
      currentStory.iWant = match[2].trim();
      currentStory.soThat = match[3].trim();
    }
  }
  
  // GWT
  else if (line.startsWith('GWT: ')) {
    if (currentStory) {
      currentStory.gwt = line.substring(5).trim();
    }
  }
}

if (currentStory) {
  stories.push(currentStory);
}

console.log(`📖 Parsed ${stories.length} stories from FULL_REQUIREMENTS.md`);
console.log('');

// Group by epic
const epics = {};
stories.forEach(story => {
  const epicTitle = story.epic.title;
  if (!epics[epicTitle]) {
    epics[epicTitle] = [];
  }
  epics[epicTitle].push(story);
});

console.log('📊 Stories by Epic:');
Object.entries(epics).forEach(([title, storyList]) => {
  console.log(`  ${title}: ${storyList.length} stories`);
});
console.log('');

// Delete all existing stories
console.log('🗑️  Deleting existing stories...');
const existingResponse = await fetch(`${API_BASE}/api/stories`);
const existing = await existingResponse.json();

function flattenStories(stories) {
  const result = [];
  for (const story of stories) {
    result.push(story);
    if (story.children && story.children.length > 0) {
      result.push(...flattenStories(story.children));
    }
  }
  return result;
}

const allExisting = flattenStories(existing);
console.log(`  Found ${allExisting.length} existing stories`);

for (const story of allExisting) {
  try {
    await fetch(`${API_BASE}/api/stories/${story.id}`, { method: 'DELETE' });
  } catch (error) {
    console.error(`  Failed to delete story ${story.id}:`, error.message);
  }
}
console.log('  ✅ Deleted all existing stories');
console.log('');

// Create epic parent stories
console.log('📝 Creating epic parent stories...');
const epicIds = {};

for (const [epicTitle, storyList] of Object.entries(epics)) {
  const epicNum = storyList[0].epic.number;
  const epicCode = storyList[0].epicCode;
  
  const epicStory = {
    title: `Epic ${epicNum}: ${epicTitle}`,
    asA: 'product manager',
    iWant: `to organize ${epicTitle.toLowerCase()} features`,
    soThat: 'I can track progress by functional area',
    description: `Parent epic for ${storyList.length} user stories`,
    acceptWarnings: true
  };
  
  try {
    const response = await fetch(`${API_BASE}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(epicStory)
    });
    
    if (response.ok) {
      const created = await response.json();
      epicIds[epicTitle] = created.id;
      console.log(`  ✅ Created: ${epicStory.title} (ID: ${created.id})`);
    } else {
      console.error(`  ❌ Failed to create epic: ${epicTitle}`);
    }
  } catch (error) {
    console.error(`  ❌ Error creating epic ${epicTitle}:`, error.message);
  }
}
console.log('');

// Create child stories
console.log('📝 Creating user stories...');
let created = 0;
let failed = 0;

for (const story of stories) {
  const parentId = epicIds[story.epic.title];
  
  const storyData = {
    title: `${story.code}: ${story.title}`,
    asA: story.asA || 'user',
    iWant: story.iWant || story.title.toLowerCase(),
    soThat: story.soThat || 'I can use the feature',
    description: `GWT: ${story.gwt}`,
    parentId: parentId,
    acceptWarnings: true
  };
  
  try {
    const response = await fetch(`${API_BASE}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storyData)
    });
    
    if (response.ok) {
      created++;
      if (created % 20 === 0) {
        console.log(`  Progress: ${created}/${stories.length}`);
      }
    } else {
      failed++;
      console.error(`  ❌ Failed: ${story.code}`);
    }
  } catch (error) {
    failed++;
    console.error(`  ❌ Error: ${story.code}:`, error.message);
  }
  
  // Rate limit
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log('');
console.log('=========================================');
console.log('Summary:');
console.log(`  ✅ Created: ${created} stories`);
console.log(`  ❌ Failed: ${failed} stories`);
console.log(`  📊 Total: ${stories.length} stories`);
console.log('=========================================');
