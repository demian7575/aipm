#!/usr/bin/env node

// AIPM Test Runner - CLI interface for running tests
import { AIPMTestFramework } from './test-implementation.js';

async function main() {
  const framework = new AIPMTestFramework();
  
  try {
    const report = await framework.runAllTests();
    
    // Write report to file
    const reportFile = `test-report-${Date.now()}.json`;
    const fs = await import('fs');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Test report saved to: ${reportFile}`);
    
    // Exit with appropriate code
    process.exit(report.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
