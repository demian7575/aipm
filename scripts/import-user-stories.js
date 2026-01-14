#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = process.env.API_URL || 'http://44.220.45.57';

// Parse markdown document into structured stories
function parseUserStories(markdown) {
  const lines = markdown.split('\n');
  const stories = [];
  let currentCategory = null;
  let currentCategoryId = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match category headers: ## 1. Architecture & Infrastructure
    const categoryMatch = line.match(/^##\s+(\d+)\.\s+(.+)$/);
    if (categoryMatch) {
      currentCategoryId = categoryMatch[1];
      currentCategory = categoryMatch[2];
      continue;
    }
    
    // Match story lines: - **Story A1: Describe runtime topology**
    const storyMatch = line.match(/^-\s+\*\*Story\s+([A-Z]\d+):\s+(.+?)\*\*$/);
    if (storyMatch && currentCategory) {
      const storyId = storyMatch[1];
      const title = storyMatch[2];
      
      // Get next lines for user story format and acceptance criteria
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
        category: currentCategory,
        categoryId: currentCategoryId,
        title,
        asA,
        iWant,
        soThat,
        acceptanceCriteria,
        description: acceptanceCriteria
      });
      
      i = j - 1;
    }
  }
  
  return stories;
}

// Create story via API
async function createStory(story, parentId = null) {
  const payload = {
    title: `${story.storyId}: ${story.title}`,
    description: story.description || story.acceptanceCriteria,
    asA: story.asA || 'user',
    iWant: story.iWant || story.title,
    soThat: story.soThat || 'the system meets requirements',
    components: ['WorkModel'], // Use valid component
    storyPoint: 3,
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
    throw new Error(`Failed to create story ${story.storyId}: ${response.statusText}`);
  }
  
  return await response.json();
}

// Main import function
async function importStories() {
  const docPath = join(__dirname, '../docs/AIPM_User_Stories.md');
  const markdown = readFileSync(docPath, 'utf-8');
  
  console.log('📖 Parsing user stories document...');
  const stories = parseUserStories(markdown);
  console.log(`✅ Found ${stories.length} stories`);
  
  // Group by category
  const categories = {};
  stories.forEach(story => {
    if (!categories[story.category]) {
      categories[story.category] = [];
    }
    categories[story.category].push(story);
  });
  
  console.log(`📊 ${Object.keys(categories).length} categories`);
  
  // Create parent story for each category, then child stories
  const categoryParents = {};
  
  for (const [categoryName, categoryStories] of Object.entries(categories)) {
    console.log(`\n📁 Creating category: ${categoryName}`);
    
    // Create parent story for category
    const parentStory = {
      storyId: categoryStories[0].categoryId,
      title: categoryName,
      description: `Parent story for ${categoryName} user stories`,
      asA: 'project manager',
      iWant: `to organize ${categoryName} stories`,
      soThat: 'the backlog is well-structured'
    };
    
    try {
      const parent = await createStory(parentStory);
      categoryParents[categoryName] = parent.id;
      console.log(`  ✅ Created parent: ${parent.id}`);
      
      // Create child stories
      for (const story of categoryStories) {
        try {
          const child = await createStory(story, parent.id);
          console.log(`    ✅ ${story.storyId}: ${story.title.substring(0, 50)}...`);
        } catch (error) {
          console.error(`    ❌ ${story.storyId}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`  ❌ Failed to create category parent: ${error.message}`);
    }
  }
  
  console.log('\n✨ Import complete!');
}

// Run import
importStories().catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
