// PR #999 Implementation
// Enhanced functionality for test operations

export class TestManager {
  constructor() {
    this.tests = new Map();
    this.results = [];
  }

  addTest(name, testFn) {
    this.tests.set(name, testFn);
  }

  async runTest(name) {
    const testFn = this.tests.get(name);
    if (!testFn) {
      throw new Error(`Test not found: ${name}`);
    }

    try {
      await testFn();
      this.results.push({ name, status: 'PASS' });
      return true;
    } catch (error) {
      this.results.push({ name, status: 'FAIL', error: error.message });
      return false;
    }
  }

  async runAll() {
    const results = [];
    for (const [name] of this.tests) {
      const result = await this.runTest(name);
      results.push({ name, passed: result });
    }
    return results;
  }

  getReport() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    return {
      total: this.results.length,
      passed,
      failed: this.results.length - passed,
      results: this.results
    };
  }
}
