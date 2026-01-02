#!/usr/bin/env node

// AIPM Test Code Generation Integration
// Integrates with AIPM's story management system

import { AIPMCodeGenerator } from './test-code-gen.js';
import { writeFileSync } from 'fs';

class AIPMTestGenerator {
  constructor() {
    this.generator = new AIPMCodeGenerator();
  }

  // Generate tests for AIPM user stories
  generateStoryTests(stories) {
    const testFiles = [];
    
    stories.forEach((story, index) => {
      const testCode = this.generator.generate('story-test', story.id, {
        testBody: `
        // Validate story: ${story.title}
        framework.assertNotNull(story, 'Story should exist');
        framework.assertEquals(story.status, 'Ready', 'Story should be ready');
        
        // Test acceptance criteria
        if (story.acceptanceCriteria) {
          framework.assertNotNull(story.acceptanceCriteria, 'Should have acceptance criteria');
        }`
      });
      
      const filename = `generated-story-test-${story.id}.js`;
      writeFileSync(filename, testCode);
      testFiles.push(filename);
    });

    return testFiles;
  }

  // Generate API endpoint tests
  generateAPITests() {
    const endpoints = [
      { path: '/api/stories', method: 'GET' },
      { path: '/api/draft-response', method: 'POST' },
      { path: '/health', method: 'GET' }
    ];

    const testFiles = [];
    
    endpoints.forEach(endpoint => {
      const testCode = this.generator.generate('api-test', endpoint.path, {
        method: endpoint.method
      });
      
      const filename = `generated-api-test-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '')}.js`;
      writeFileSync(filename, testCode);
      testFiles.push(filename);
    });

    return testFiles;
  }

  // Generate comprehensive test suite
  generateTestSuite(options = {}) {
    const tests = [];
    
    if (options.includeStories) {
      tests.push({ name: 'StoryValidation', type: 'story-test' });
    }
    
    if (options.includeAPI) {
      tests.push({ name: 'APIEndpoints', type: 'api-test' });
    }

    const suiteCode = this.generator.generateTestSuite(tests);
    writeFileSync('generated-test-suite.js', suiteCode);
    
    return 'generated-test-suite.js';
  }
}

async function main() {
  const testGen = new AIPMTestGenerator();
  
  console.log('🔧 Generating AIPM test code...\n');
  
  // Generate API tests
  const apiTests = testGen.generateAPITests();
  console.log(`✅ Generated ${apiTests.length} API tests`);
  
  // Generate test suite
  const suiteFile = testGen.generateTestSuite({ 
    includeAPI: true,
    includeStories: true 
  });
  console.log(`✅ Generated test suite: ${suiteFile}`);
  
  console.log('\n🎉 Test code generation complete!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
