#!/bin/bash

# Enhanced Simple Test Runner
# Executes the enhanced simple test function suite

echo "🚀 Starting Enhanced Simple Test Suite..."

node --input-type=module -e "
import { runAllTests } from './simple-test-function.js';

const results = runAllTests();

if (results.success) {
  console.log('🎉 Enhanced simple test suite completed successfully');
  process.exit(0);
} else {
  console.log('💥 Enhanced simple test suite failed');
  process.exit(1);
}
"
