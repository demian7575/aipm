#!/bin/bash

# Master Simple Test Runner
# Executes the master simple test function suite

echo "👑 Starting Master Simple Test Suite..."

node --input-type=module -e "
import { runMasterTestSuite } from './simple-test-master.js';

const results = runMasterTestSuite();

console.log(\`\n📊 Master Test Statistics:\`);
console.log(\`   Total Tests: \${results.summary.total}\`);
console.log(\`   Passed: \${results.summary.passed}\`);
console.log(\`   Failed: \${results.summary.failed}\`);
console.log(\`   Pass Rate: \${results.summary.passRate}%\`);
console.log(\`   Execution Time: \${results.summary.executionTime}ms\`);
console.log(\`   Test Efficiency: \${results.summary.efficiency} tests/sec\`);

if (results.success) {
  console.log('👑 Master simple test suite completed successfully');
  process.exit(0);
} else {
  console.log('💥 Master simple test suite failed');
  process.exit(1);
}
"
