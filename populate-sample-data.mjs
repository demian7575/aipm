#!/usr/bin/env node

// Simple script to populate database with sample user stories
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sampleStories = [
  {
    id: 1,
    parent_id: null,
    title: "AI Project Management System",
    description: "Complete project management system with AI capabilities",
    as_a: "Project Manager",
    i_want: "comprehensive project management tools",
    so_that: "I can efficiently manage AI development projects",
    components: '["System"]',
    story_points: 13,
    assignee: "pm@aipm.dev",
    status: "Ready",
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 2,
    parent_id: 1,
    title: "User Authentication System",
    description: "Secure user login and registration",
    as_a: "User",
    i_want: "secure authentication",
    so_that: "I can safely access the system",
    components: '["System"]',
    story_points: 8,
    assignee: "dev@aipm.dev",
    status: "In Progress",
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 3,
    parent_id: 1,
    title: "Project Dashboard",
    description: "Visual dashboard showing project metrics",
    as_a: "Project Manager",
    i_want: "visual project overview",
    so_that: "I can quickly assess project status",
    components: '["WorkModel"]',
    story_points: 5,
    assignee: "ui@aipm.dev",
    status: "Ready",
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 4,
    parent_id: 2,
    title: "OAuth Integration",
    description: "Support for Google and GitHub OAuth",
    as_a: "User",
    i_want: "social login options",
    so_that: "I can login with existing accounts",
    components: '["System"]',
    story_points: 3,
    assignee: "dev@aipm.dev",
    status: "Ready",
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 5,
    parent_id: 2,
    title: "Password Reset",
    description: "Email-based password recovery",
    as_a: "User",
    i_want: "password recovery option",
    so_that: "I can regain access if I forget my password",
    components: '["System"]',
    story_points: 2,
    assignee: "dev@aipm.dev",
    status: "Done",
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 6,
    parent_id: 3,
    title: "Real-time Metrics",
    description: "Live updating project metrics",
    as_a: "Project Manager",
    i_want: "real-time data updates",
    so_that: "I can see current project status",
    components: '["WorkModel", "System"]',
    story_points: 8,
    assignee: "ui@aipm.dev",
    status: "Ready",
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 7,
    parent_id: 3,
    title: "Export Reports",
    description: "Generate PDF and Excel reports",
    as_a: "Project Manager",
    i_want: "exportable reports",
    so_that: "I can share project status with stakeholders",
    components: '["DocumentIntelligence"]',
    story_points: 5,
    assignee: "dev@aipm.dev",
    status: "Ready",
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 8,
    parent_id: 1,
    title: "AI Code Generation",
    description: "Automated code generation using AI",
    as_a: "Developer",
    i_want: "AI-assisted coding",
    so_that: "I can accelerate development",
    components: '["System", "WorkModel"]',
    story_points: 13,
    assignee: "ai@aipm.dev",
    status: "Ready",
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 9,
    parent_id: 8,
    title: "Code Review Assistant",
    description: "AI-powered code review suggestions",
    as_a: "Developer",
    i_want: "automated code review",
    so_that: "I can improve code quality",
    components: '["Review & Governance"]',
    story_points: 8,
    assignee: "ai@aipm.dev",
    status: "Ready",
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 10,
    parent_id: 8,
    title: "Test Generation",
    description: "Automatic test case generation",
    as_a: "Developer",
    i_want: "automated test creation",
    so_that: "I can ensure code coverage",
    components: '["Run & Verify"]',
    story_points: 5,
    assignee: "qa@aipm.dev",
    status: "Ready",
    created_at: Date.now(),
    updated_at: Date.now()
  }
];

const acceptanceTests = [
  {
    id: 1,
    story_id: 2,
    title: "User can login with email",
    given: "User has valid credentials",
    when_step: "User enters email and password",
    then_step: "User is logged in successfully",
    status: "Pass",
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 2,
    story_id: 3,
    title: "Dashboard shows project metrics",
    given: "User is logged in as project manager",
    when_step: "User navigates to dashboard",
    then_step: "Dashboard displays current project metrics",
    status: "Pass",
    created_at: Date.now(),
    updated_at: Date.now()
  }
];

// Create JSON data structure
const jsonData = {
  stories: sampleStories,
  acceptanceTests: acceptanceTests
};

// Write to JSON file
const jsonPath = join(process.cwd(), 'apps/backend/data/app.sqlite.json');
writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

console.log(`✅ Created ${sampleStories.length} sample stories in ${jsonPath}`);
console.log('📊 Story hierarchy:');
sampleStories.forEach(story => {
  const indent = story.parent_id ? '  '.repeat(getDepth(story.id, sampleStories)) : '';
  console.log(`${indent}- ${story.title} (${story.status})`);
});

function getDepth(id, stories) {
  const story = stories.find(s => s.id === id);
  if (!story || !story.parent_id) return 0;
  return 1 + getDepth(story.parent_id, stories);
}
