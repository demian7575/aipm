#!/usr/bin/env node

const API_URL = 'http://44.220.45.57';

// New 6-root structure
const newStructure = [
  {
    title: 'Platform Architecture',
    description: 'System architecture, infrastructure, and integration patterns',
    oldParents: [1768375585299, 1768375922149] // Architecture & Infrastructure, Integration & Automation
  },
  {
    title: 'Core Services',
    description: 'Backend APIs, data layer, and development environment setup',
    oldParents: [1768375619309, 1768375686588] // Backend API & Data Layer, Environment Setup & Tooling
  },
  {
    title: 'User Experience',
    description: 'Frontend UI, UX patterns, and user interactions',
    oldParents: [1768375652638] // Frontend UI & UX
  },
  {
    title: 'Development & Delivery',
    description: 'Development workflows, PR process, and deployment pipelines',
    oldParents: [1768375719900, 1768375820678] // Development Workflows & PR Process, Deployment & Release Management
  },
  {
    title: 'Quality & Security',
    description: 'Testing frameworks, quality gates, and security compliance',
    oldParents: [1768375753358, 1768375787324] // Testing & Quality Gates, Security & Compliance
  },
  {
    title: 'Operations',
    description: 'Monitoring, configuration management, and operational maintenance',
    oldParents: [1768375854229, 1768375888558, 1768375955814] // Monitoring/Logging/Troubleshooting, Config Management, Maintenance/Operations/DR
  }
];

async function createRootStory(root) {
  const payload = {
    title: root.title,
    description: root.description,
    asA: 'system architect',
    iWant: `to organize ${root.title} stories`,
    soThat: 'the system is well-structured',
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
  
  if (!response.ok) throw new Error(`${response.status}`);
  return await response.json();
}

async function updateStoryParent(storyId, newParentId) {
  const response = await fetch(`${API_URL}/api/stories/${storyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId: newParentId, acceptWarnings: true })
  });
  
  if (!response.ok) throw new Error(`${response.status}`);
  return await response.json();
}

async function getStoryChildren(parentId) {
  const response = await fetch(`${API_URL}/api/stories`);
  const stories = await response.json();
  return stories.filter(s => s.parentId === parentId);
}

async function main() {
  console.log('Creating 6 new root stories...\n');
  
  for (const root of newStructure) {
    try {
      const newRoot = await createRootStory(root);
      console.log(`✅ Created: ${root.title} (ID: ${newRoot.id})`);
      
      // Move old category parents under new root
      for (const oldParentId of root.oldParents) {
        try {
          await updateStoryParent(oldParentId, newRoot.id);
          console.log(`  ↳ Moved category ${oldParentId} under ${newRoot.id}`);
        } catch (error) {
          console.error(`  ❌ Failed to move ${oldParentId}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ ${root.title}: ${error.message}`);
    }
  }
  
  console.log('\n✨ Restructured to 6 root categories!');
  console.log('View at: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/');
}

main();
