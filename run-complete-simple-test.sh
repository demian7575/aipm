#!/bin/bash

# Complete Simple Test Runner
# Executes the complete simple test function suite

echo "🎯 Starting Complete Simple Test Suite..."

node --input-type=module -e "
import { runCompleteTestSuite } from './simple-test-complete.js';

const results = runCompleteTestSuite();

console.log(\`\n📊 Test Statistics:\`);
console.log(\`   Total Tests: \${results.summary.total}\`);
console.log(\`   Passed: \${results.summary.passed}\`);
console.log(\`   Failed: \${results.summary.failed}\`);
console.log(\`   Pass Rate: \${results.summary.passRate}%\`);

if (results.success) {
  console.log('🏆 Complete simple test suite completed successfully');
  process.exit(0);
} else {
  console.log('💥 Complete simple test suite failed');
  process.exit(1);
}
"
