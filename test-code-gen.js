// Enhanced Code Generation for AIPM Test Framework
// Integrates with AIPM's testing infrastructure

export class AIPMCodeGenerator {
  constructor() {
    this.templates = new Map();
    this.setupAIPMTemplates();
  }

  setupAIPMTemplates() {
    // AIPM Test Function Template
    this.templates.set('test', (name, options = {}) => {
      const testType = options.type || 'unit';
      const description = options.description || `Test for ${name}`;
      return `
// Generated ${testType} test: ${name}
export function test${name}() {
  // ${description}
  try {
    ${options.body || '// Test implementation here\nreturn true;'}
  } catch (error) {
    throw new Error(\`${name} test failed: \${error.message}\`);
  }
}`;
    });

    // AIPM Story Test Template
    this.templates.set('story-test', (storyId, options = {}) => {
      return `
// Generated test for User Story ${storyId}
import { AIPMTestFramework } from './test-implementation.js';

export async function testStory${storyId}() {
  const framework = new AIPMTestFramework();
  
  await framework.runTest('Story ${storyId} validation', async () => {
    // Test story functionality
    ${options.testBody || 'framework.assertEquals(true, true, "Story test placeholder");'}
  });
  
  return framework.generateReport();
}`;
    });

    // AIPM API Test Template
    this.templates.set('api-test', (endpoint, options = {}) => {
      const method = options.method || 'GET';
      return `
// Generated API test for ${method} ${endpoint}
export async function testAPI${endpoint.replace(/[^a-zA-Z0-9]/g, '')}() {
  const response = await fetch('${endpoint}', {
    method: '${method}',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(\`API test failed: \${response.status}\`);
  }
  
  return await response.json();
}`;
    });
  }

  generate(type, name, options = {}) {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Unknown template type: ${type}`);
    }
    return template(name, options);
  }

  generateTestSuite(tests) {
    const testImports = tests.map((test, i) => `import { test${test.name} } from './generated-test-${i}.js';`).join('\n');
    const testCalls = tests.map(test => `await test${test.name}();`).join('\n  ');
    
    return `
// Generated Test Suite
${testImports}

export async function runGeneratedTests() {
  console.log('🧪 Running generated tests...');
  
  try {
    ${testCalls}
    console.log('✅ All generated tests passed');
    return true;
  } catch (error) {
    console.error('❌ Generated test failed:', error.message);
    return false;
  }
}`;
  }
}

// Legacy compatibility
export function generateTestCode(spec) {
  const generator = new AIPMCodeGenerator();
  return generator.generate('test', spec.name, spec);
}
