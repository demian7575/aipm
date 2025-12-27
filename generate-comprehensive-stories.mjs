#!/usr/bin/env node

// Generate comprehensive 45+ user story dataset for AIPM
import { writeFileSync } from 'node:fs';

const stories = [];
const acceptanceTests = [];
let storyId = 1;
let testId = 1;

// Helper function to add story
function addStory(title, description, asA, iWant, soThat, parentId = null, status = 'Ready', points = 3) {
  const story = {
    id: storyId++,
    parent_id: parentId,
    title,
    description,
    as_a: asA,
    i_want: iWant,
    so_that: soThat,
    components: '["System"]',
    story_points: points,
    assignee: 'dev@aipm.dev',
    status,
    created_at: Date.now(),
    updated_at: Date.now()
  };
  stories.push(story);
  return story.id;
}

// Helper function to add acceptance test
function addTest(storyId, title, given, when, then, status = 'Pass') {
  acceptanceTests.push({
    id: testId++,
    story_id: storyId,
    title,
    given,
    when_step: when,
    then_step: then,
    status,
    created_at: Date.now(),
    updated_at: Date.now()
  });
}

// 1. MAIN EPIC: Clean Development Task Interface (the story we've been testing)
const mainEpic = addStory(
  'Clean Development Task Interface',
  'Simplify the Development Task interface by removing unnecessary branch management complexity to provide a clean and focused task management experience.',
  'Developer',
  'to remove Branch, PR created, and Rebase links from the Development Task interface',
  'I can have a simple and clean task management interface without unnecessary branch management complexity',
  null, 'Done', 8
);

addTest(mainEpic, 'Development Task interface is clean', 'I am viewing a Development Task card', 'I look at the available actions', 'I should not see Branch, PR created, or Rebase links');

// Sub-stories for the main epic
const removeConversation = addStory('Remove View Conversation Link', 'Remove the View conversation link from Development Task cards', 'Developer', 'the View conversation link removed', 'I have fewer distracting elements', mainEpic, 'Done', 1);
const removeUpdate = addStory('Remove Latest Update Link', 'Remove the View latest update link from Development Task cards', 'Developer', 'the View latest update link removed', 'the interface is cleaner', mainEpic, 'Done', 1);
const removeRebase = addStory('Remove Rebase Button', 'Remove the Rebase button and associated functionality', 'Developer', 'the Rebase button removed', 'I am not distracted by branch operations', mainEpic, 'Done', 2);

// 2. EPIC: AI Project Management System
const aipmEpic = addStory('AI Project Management System', 'Complete AI-powered project management platform', 'Project Manager', 'comprehensive AI project management tools', 'I can efficiently manage complex AI development projects', null, 'In Progress', 13);

// User Authentication & Security
const authEpic = addStory('User Authentication System', 'Secure user authentication and authorization', 'User', 'secure authentication system', 'I can safely access the platform', aipmEpic, 'Ready', 8);
addStory('OAuth Integration', 'Support for Google and GitHub OAuth', 'User', 'social login options', 'I can login with existing accounts', authEpic, 'Ready', 3);
addStory('Password Reset', 'Email-based password recovery', 'User', 'password recovery option', 'I can regain access if I forget password', authEpic, 'Done', 2);
addStory('Multi-Factor Authentication', 'Two-factor authentication support', 'Security Admin', 'MFA for sensitive accounts', 'user accounts are more secure', authEpic, 'Ready', 5);

// Project Dashboard & Analytics
const dashboardEpic = addStory('Project Dashboard', 'Visual dashboard showing project metrics and insights', 'Project Manager', 'visual project overview with real-time data', 'I can quickly assess project status and make informed decisions', aipmEpic, 'In Progress', 8);
addStory('Real-time Metrics', 'Live updating project metrics and KPIs', 'Project Manager', 'real-time data updates', 'I can see current project status instantly', dashboardEpic, 'Ready', 5);
addStory('Export Reports', 'Generate PDF and Excel reports', 'Project Manager', 'exportable reports', 'I can share project status with stakeholders', dashboardEpic, 'Ready', 3);
addStory('Custom Widgets', 'Customizable dashboard widgets', 'Project Manager', 'personalized dashboard layout', 'I can focus on metrics that matter most', dashboardEpic, 'Ready', 5);

// AI Code Generation & Assistance
const aiCodeEpic = addStory('AI Code Generation', 'Automated code generation using AI', 'Developer', 'AI-assisted coding capabilities', 'I can accelerate development with intelligent code suggestions', aipmEpic, 'In Progress', 13);
addStory('Code Review Assistant', 'AI-powered code review suggestions', 'Developer', 'automated code review feedback', 'I can improve code quality efficiently', aiCodeEpic, 'Ready', 8);
addStory('Test Generation', 'Automatic test case generation', 'Developer', 'automated test creation', 'I can ensure comprehensive code coverage', aiCodeEpic, 'Ready', 5);
addStory('Documentation Generator', 'AI-generated code documentation', 'Developer', 'automatic documentation generation', 'code is properly documented without manual effort', aiCodeEpic, 'Ready', 3);

// Story Management & INVEST Analysis
const storyEpic = addStory('Story Management System', 'Comprehensive user story management with INVEST analysis', 'Product Owner', 'advanced story management tools', 'I can create and maintain high-quality user stories', aipmEpic, 'Ready', 8);
addStory('INVEST Validation', 'Automatic INVEST criteria validation', 'Product Owner', 'stories validated against INVEST principles', 'all stories meet quality standards', storyEpic, 'Ready', 5);
addStory('Story Dependencies', 'Manage story dependencies and relationships', 'Product Owner', 'dependency tracking between stories', 'I can plan releases effectively', storyEpic, 'Ready', 5);
addStory('Story Templates', 'Predefined story templates', 'Product Owner', 'story templates for common patterns', 'I can create consistent stories quickly', storyEpic, 'Ready', 3);

// Mindmap & Visualization
const mindmapEpic = addStory('Interactive Mindmap', 'Visual story hierarchy with interactive mindmap', 'Product Owner', 'visual representation of story relationships', 'I can understand project structure at a glance', aipmEpic, 'Ready', 8);
addStory('Auto Layout', 'Automatic mindmap layout algorithms', 'Product Owner', 'automatically organized mindmap layout', 'stories are visually organized without manual positioning', mindmapEpic, 'Ready', 5);
addStory('Manual Positioning', 'Drag and drop story positioning', 'Product Owner', 'manual control over story positions', 'I can customize the visual layout', mindmapEpic, 'Ready', 3);
addStory('Zoom and Pan', 'Mindmap navigation controls', 'Product Owner', 'smooth zoom and pan controls', 'I can navigate large story hierarchies easily', mindmapEpic, 'Ready', 2);

// Team Collaboration
const collabEpic = addStory('Team Collaboration', 'Tools for team collaboration and communication', 'Team Lead', 'effective team collaboration features', 'the team can work together efficiently', aipmEpic, 'Ready', 8);
addStory('Comments System', 'Story comments and discussions', 'Team Member', 'ability to comment on stories', 'team can discuss requirements and clarifications', collabEpic, 'Ready', 3);
addStory('Notification System', 'Real-time notifications for story updates', 'Team Member', 'notifications for relevant story changes', 'I stay informed about important updates', collabEpic, 'Ready', 5);
addStory('Activity Feed', 'Timeline of project activities', 'Team Lead', 'chronological view of project activities', 'I can track team progress and contributions', collabEpic, 'Ready', 3);

// Integration & API
const integrationEpic = addStory('External Integrations', 'Integration with external tools and services', 'DevOps Engineer', 'seamless integration with development tools', 'the platform fits into existing workflows', aipmEpic, 'Ready', 8);
addStory('GitHub Integration', 'Sync with GitHub repositories and PRs', 'Developer', 'GitHub integration for PR tracking', 'development work is linked to stories', integrationEpic, 'Ready', 5);
addStory('Slack Integration', 'Slack notifications and commands', 'Team Member', 'Slack integration for notifications', 'I can stay updated without leaving Slack', integrationEpic, 'Ready', 3);
addStory('REST API', 'Comprehensive REST API', 'API Consumer', 'programmatic access to all features', 'I can build custom integrations', integrationEpic, 'Ready', 8);

// Performance & Scalability
const perfEpic = addStory('Performance Optimization', 'System performance and scalability improvements', 'System Administrator', 'high-performance system that scales', 'the platform handles large projects efficiently', aipmEpic, 'Ready', 8);
addStory('Database Optimization', 'Optimized database queries and indexing', 'System Administrator', 'fast database operations', 'users experience quick response times', perfEpic, 'Ready', 5);
addStory('Caching Layer', 'Intelligent caching for frequently accessed data', 'System Administrator', 'effective caching strategy', 'system performance is optimized', perfEpic, 'Ready', 5);
addStory('Load Balancing', 'Horizontal scaling with load balancing', 'System Administrator', 'system that handles high traffic', 'platform remains responsive under load', perfEpic, 'Ready', 8);

// Security & Compliance
const securityEpic = addStory('Security & Compliance', 'Enterprise-grade security and compliance features', 'Security Officer', 'comprehensive security controls', 'the platform meets enterprise security requirements', aipmEpic, 'Ready', 8);
addStory('Audit Logging', 'Comprehensive audit trail', 'Security Officer', 'detailed audit logs of all actions', 'I can track all system activities for compliance', securityEpic, 'Ready', 5);
addStory('Role-Based Access', 'Granular role-based permissions', 'Security Officer', 'fine-grained access control', 'users only access what they need', securityEpic, 'Ready', 5);
addStory('Data Encryption', 'End-to-end data encryption', 'Security Officer', 'all data encrypted at rest and in transit', 'sensitive information is protected', securityEpic, 'Ready', 8);

// Mobile & Accessibility
const mobileEpic = addStory('Mobile & Accessibility', 'Mobile-responsive design and accessibility features', 'Product Manager', 'accessible platform that works on all devices', 'all users can access the platform effectively', aipmEpic, 'Ready', 8);
addStory('Responsive Design', 'Mobile-responsive user interface', 'Mobile User', 'platform that works well on mobile devices', 'I can manage projects from anywhere', mobileEpic, 'Ready', 5);
addStory('Accessibility Compliance', 'WCAG 2.1 AA compliance', 'Accessibility Advocate', 'platform accessible to users with disabilities', 'everyone can use the platform effectively', mobileEpic, 'Ready', 8);
addStory('Offline Support', 'Basic offline functionality', 'Remote Worker', 'ability to work offline', 'I can continue working without internet connection', mobileEpic, 'Ready', 8);

// Analytics & Reporting
const analyticsEpic = addStory('Advanced Analytics', 'Comprehensive analytics and reporting capabilities', 'Data Analyst', 'detailed analytics and insights', 'I can make data-driven decisions', aipmEpic, 'Ready', 8);
addStory('Velocity Tracking', 'Team velocity and burndown charts', 'Scrum Master', 'velocity metrics and trends', 'I can track team performance over time', analyticsEpic, 'Ready', 5);
addStory('Predictive Analytics', 'AI-powered project predictions', 'Project Manager', 'predictive insights about project outcomes', 'I can proactively address potential issues', analyticsEpic, 'Ready', 8);
addStory('Custom Reports', 'Configurable custom reports', 'Stakeholder', 'reports tailored to specific needs', 'I get exactly the information I need', analyticsEpic, 'Ready', 5);

// Add some acceptance tests for key stories
addTest(aipmEpic, 'AIPM system is functional', 'I am a project manager', 'I access the AIPM platform', 'I can manage AI development projects effectively');
addTest(authEpic, 'Users can authenticate securely', 'I am a user with valid credentials', 'I attempt to log in', 'I am authenticated and can access the system');
addTest(dashboardEpic, 'Dashboard shows project metrics', 'I am logged in as a project manager', 'I view the dashboard', 'I see real-time project metrics and insights');
addTest(aiCodeEpic, 'AI generates helpful code', 'I am a developer working on a feature', 'I request AI code assistance', 'I receive relevant and helpful code suggestions');
addTest(mindmapEpic, 'Mindmap visualizes story hierarchy', 'I have a project with multiple stories', 'I view the mindmap', 'I see a clear visual representation of story relationships');

console.log(`Generated ${stories.length} stories and ${acceptanceTests.length} acceptance tests`);

// Save to file
const data = { stories, acceptanceTests };
writeFileSync('comprehensive-aipm-stories.json', JSON.stringify(data, null, 2));

console.log('✅ Comprehensive AIPM story dataset created!');
