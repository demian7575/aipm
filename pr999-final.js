// PR #999 Final Implementation
// Complete test functionality with validation

export class TestValidator {
  constructor() {
    this.tests = [];
    this.validationRules = new Map();
  }

  addTest(name, testFn, validation = null) {
    this.tests.push({ name, testFn, validation });
  }

  async validateAndRun(testName) {
    const test = this.tests.find(t => t.name === testName);
    if (!test) {
      throw new Error(`Test not found: ${testName}`);
    }

    if (test.validation) {
      const isValid = await test.validation();
      if (!isValid) {
        throw new Error(`Test validation failed: ${testName}`);
      }
    }

    return await test.testFn();
  }

  async runAll() {
    const results = [];
    for (const test of this.tests) {
      try {
        await this.validateAndRun(test.name);
        results.push({ name: test.name, status: 'PASS' });
      } catch (error) {
        results.push({ name: test.name, status: 'FAIL', error: error.message });
      }
    }
    return results;
  }
}

export function createTest(name, testFn) {
  return { name, testFn };
}
