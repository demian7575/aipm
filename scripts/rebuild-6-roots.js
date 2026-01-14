#!/usr/bin/env node

import { readFileSync } from 'fs';

const API_URL = 'http://44.220.45.57';

// 6-root structure with category mappings
const structure = {
  'Platform Architecture': {
    description: 'System architecture, infrastructure, and integration patterns',
    categories: ['1', '11'] // Architecture & Infrastructure, Integration & Automation
  },
  'Core Services': {
    description: 'Backend APIs, data layer, and development environment',
    categories: ['2', '4'] // Backend API & Data Layer, Environment Setup & Tooling
  },
  'User Experience': {
    description: 'Frontend UI, UX patterns, and user interactions',
    categories: ['3'] // Frontend UI & UX
  },
  'Development & Delivery': {
    description: 'Development workflows, PR process, and deployment',
    categories: ['5', '8'] // Dev Workflows & PR Process, Deployment & Release
  },
  'Quality & Security': {
    description: 'Testing, quality gates, and security compliance',
    categories: ['6', '7'] // Testing & Quality Gates, Security & Compliance
  },
  'Operations': {
    description: 'Monitoring, configuration, and operational maintenance',
    categories: ['9', '10', '12'] // Monitoring/Logging, Config Management, Maintenance/Ops
  }
};

async function deleteAllStories() {
  const response = await fetch(`${API_URL}/api/stories`);
  const stories = await response.json();
  
  console.log(`Deleting ${stories.length} existing stories...`);
  
  for (const story of stories) {
    try {
      await fetch(`${API_URL}/api/stories/${story.id}`, { method: 'DELETE' });
    } catch (error) {
      // Ignore errors
    }
  }
  
  console.log('✅ Cleared all stories\n');
}

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

async function createStory(payload) {
  const response = await fetch(`${API_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) throw new Error(`${response.status}`);
  return await response.json();
}

async function main() {
  // Delete all existing stories
  await deleteAllStories();
  
  // Parse stories from document
  const markdown = readFileSync('docs/AIPM_User_Stories.md', 'utf-8');
  const allStories = parseStories(markdown);
  
  console.log('Creating 6-root structure...\n');
  
  let totalCreated = 0;
  
  for (const [rootTitle, rootData] of Object.entries(structure)) {
    // Create root story
    const root = await createStory({
      title: rootTitle,
      description: rootData.description,
      asA: 'system architect',
      iWant: `to organize ${rootTitle} stories`,
      soThat: 'the system is well-structured',
      components: ['WorkModel'],
      storyPoint: 0,
      status: 'Draft',
      acceptWarnings: true
    });
    
    console.log(`✅ ${rootTitle} (ID: ${root.id})`);
    
    // Get stories for this root's categories
    const rootStories = allStories.filter(s => rootData.categories.includes(s.categoryId));
    
    // Create child stories
    for (const story of rootStories) {
      try {
        await createStory({
          title: `${story.storyId}: ${story.title}`,
          description: story.acceptanceCriteria || story.title,
          asA: story.asA,
          iWant: story.iWant,
          soThat: story.soThat,
          components: ['WorkModel'],
          storyPoint: 2,
          status: 'Draft',
          parentId: root.id,
          acceptWarnings: true
        });
        totalCreated++;
        console.log(`  ↳ ${story.storyId}: ${story.title.substring(0, 50)}`);
      } catch (error) {
        console.error(`  ❌ ${story.storyId}: ${error.message}`);
      }
    }
  }
  
  console.log(`\n✨ Created 6 roots + ${totalCreated} stories`);
}

main();
