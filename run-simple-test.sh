#!/bin/bash

# Simple Test Runner for AIPM
# Executes the simple test function and reports results

echo "🧪 Running Simple Test Suite..."

# Run the simple test using ES modules
node --input-type=module -e "
import { runSimpleTest, validateTestEnvironment } from './simple-test.js';

console.log('=== Simple Test Execution ===');
validateTestEnvironment();
const result = runSimpleTest();

if (result) {
  console.log('✅ Simple test suite completed successfully');
  process.exit(0);
} else {
  console.log('❌ Simple test suite failed');
  process.exit(1);
}
"
