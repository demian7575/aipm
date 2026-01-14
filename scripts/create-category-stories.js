#!/usr/bin/env node

const API_URL = 'http://44.220.45.57';

const categories = [
  { id: 1, title: 'Architecture & Infrastructure' },
  { id: 2, title: 'Backend API & Data Layer' },
  { id: 3, title: 'Frontend UI & UX' },
  { id: 4, title: 'Environment Setup & Tooling' },
  { id: 5, title: 'Development Workflows & PR Process' },
  { id: 6, title: 'Testing & Quality Gates' },
  { id: 7, title: 'Security & Compliance' },
  { id: 8, title: 'Deployment & Release Management' },
  { id: 9, title: 'Monitoring, Logging & Troubleshooting' },
  { id: 10, title: 'Configuration Management & Feature Flags' },
  { id: 11, title: 'Integration & Automation' },
  { id: 12, title: 'Maintenance, Operations & DR' }
];

async function createCategory(cat) {
  const payload = {
    title: `${cat.id}. ${cat.title}`,
    description: `Parent story for ${cat.title} user stories from AIPM_User_Stories.md`,
    asA: 'project manager',
    iWant: `to organize ${cat.title} stories`,
    soThat: 'the backlog is well-structured',
    components: ['WorkModel'],
    storyPoint: 0,
    assigneeEmail: '',
    status: 'Draft',
    acceptWarnings: true
  };
  
  const response = await fetch(`${API_URL}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }
  
  return await response.json();
}

async function main() {
  console.log('Creating 12 category parent stories...\n');
  
  for (const cat of categories) {
    try {
      const result = await createCategory(cat);
      console.log(`✅ ${cat.id}. ${cat.title} (ID: ${result.id})`);
    } catch (error) {
      console.error(`❌ ${cat.id}. ${cat.title}: ${error.message}`);
    }
  }
  
  console.log('\n✨ Done! Check http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/');
}

main();
