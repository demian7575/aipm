// Test Code Generation - Enhanced
export class TestCodeGenerator {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  addTest(name, testFunction) {
    this.tests.push({ name, testFunction });
    return this;
  }

  runTests() {
    console.log(`Running ${this.tests.length} tests...`);
    
    this.results = this.tests.map(test => {
      try {
        const startTime = Date.now();
        const result = test.testFunction();
        const duration = Date.now() - startTime;
        
        return {
          name: test.name,
          passed: result === true,
          duration,
          result
        };
      } catch (error) {
        return {
          name: test.name,
          passed: false,
          error: error.message
        };
      }
    });

    return this.getReport();
  }

  getReport() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    return {
      summary: `${passed}/${total} tests passed`,
      passed,
      total,
      results: this.results
    };
  }
}
