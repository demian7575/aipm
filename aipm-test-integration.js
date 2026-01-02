/**
 * AIPM Test Code Integration
 * Integrates generated tests with AIPM framework
 */

import { AIPMTestFramework } from './test-implementation.js';
import { generateTestCode } from './test-code-generation.js';

export class AIPMTestCodeGenerator {
  constructor() {
    this.framework = new AIPMTestFramework();
  }

  /**
   * Generate and register test with AIPM framework
   * @param {string} testName - Name of the test
   * @param {Object} options - Test options
   */
  generateAndRegister(testName, options = {}) {
    const testCode = generateTestCode(testName);
    
    // Create test function from generated code
    const testFn = new Function('return ' + testCode)();
    
    // Register with AIPM framework
    this.framework.addTest(testName, testFn);
    
    return testCode;
  }

  /**
   * Generate tests for AIPM user stories
   * @param {Array} stories - Array of user stories
   */
  generateStoryTests(stories) {
    const generatedTests = [];
    
    stories.forEach(story => {
      const testName = `Story${story.id}`;
      const testCode = this.generateAndRegister(testName, {
        storyId: story.id,
        title: story.title
      });
      
      generatedTests.push({
        name: testName,
        code: testCode,
        storyId: story.id
      });
    });
    
    return generatedTests;
  }

  /**
   * Run all generated tests
   */
  async runGeneratedTests() {
    return await this.framework.runAllTests();
  }
}
