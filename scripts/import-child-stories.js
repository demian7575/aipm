#!/usr/bin/env node

import { readFileSync } from 'fs';

const API_URL = 'http://44.220.45.57';

// Parent story IDs from previous creation
const parentIds = {
  '1': 1768375585299,
  '2': 1768375619309,
  '3': 1768375652638,
  '4': 1768375686588,
  '5': 1768375719900,
  '6': 1768375753358,
  '7': 1768375787324,
  '8': 1768375820678,
  '9': 1768375854229,
  '10': 1768375888558,
  '11': 1768375922149,
  '12': 1768375955814
};

function parseStories(markdown) {
  const lines = markdown.split('\n');
  const stories = [];
  let currentCategoryId = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const categoryMatch = line.match(/^##\s+(\d+)\./);
    if (categoryMatch) {
      currentCategoryId = categoryMatch[1];
      continue;
    }
    
    const storyMatch = line.match(/^-\s+\*\*Story\s+([A-Z]\d+):\s+(.+?)\*\*$/);
    if (storyMatch && currentCategoryId) {
      const storyId = storyMatch[1];
      const title = storyMatch[2];
      
      let asA = '', iWant = '', soThat = '', acceptanceCriteria = '';
      let j = i + 1;
      
      while (j < lines.length && !lines[j].match(/^-\s+\*\*Story/) && !lines[j].match(/^##/)) {
        const nextLine = lines[j].trim();
        
        if (nextLine.startsWith('As a') || nextLine.startsWith('As an')) {
          const parts = nextLine.split(/,\s*I\s+(want|need)/i);
          asA = parts[0].replace(/^As an?\s+/i, '').trim();
          
          if (parts[1]) {
            const wantParts = parts[1].split(/\s+so\s+(that\s+)?I\s+can/i);
            iWant = wantParts[0].replace(/^(want|need)\s+/i, '').trim();
            if (wantParts[2]) {
              soThat = wantParts[2].trim().replace(/\.$/, '');
            }
          }
        }
        
        if (nextLine.startsWith('**Acceptance Criteria:**')) {
          acceptanceCriteria = nextLine.replace('**Acceptance Criteria:**', '').trim();
        }
        
        j++;
      }
      
      stories.push({
        storyId,
        categoryId: currentCategoryId,
        title,
        asA: asA || 'user',
        iWant: iWant || title,
        soThat: soThat || 'requirements are met',
        acceptanceCriteria
      });
      
      i = j - 1;
    }
  }
  
  return stories;
}

async function createStory(story, parentId) {
  const payload = {
    title: `${story.storyId}: ${story.title}`,
    description: story.acceptanceCriteria || story.title,
    asA: story.asA,
    iWant: story.iWant,
    soThat: story.soThat,
    components: ['WorkModel'],
    storyPoint: 2,
    assigneeEmail: '',
    status: 'Draft',
    parentId: parentId,
    acceptWarnings: true
  };
  
  const response = await fetch(`${API_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`${response.status}`);
  }
  
  return await response.json();
}

async function main() {
  const markdown = readFileSync('docs/AIPM_User_Stories.md', 'utf-8');
  const stories = parseStories(markdown);
  
  console.log(`Importing ${stories.length} stories...\n`);
  
  let count = 0;
  for (const story of stories) {
    const parentId = parentIds[story.categoryId];
    if (!parentId) {
      console.error(`❌ ${story.storyId}: No parent for category ${story.categoryId}`);
      continue;
    }
    
    try {
      await createStory(story, parentId);
      count++;
      console.log(`✅ ${count}/${stories.length} ${story.storyId}: ${story.title.substring(0, 60)}`);
    } catch (error) {
      console.error(`❌ ${story.storyId}: ${error.message}`);
    }
  }
  
  console.log(`\n✨ Imported ${count}/${stories.length} stories`);
}

main();
