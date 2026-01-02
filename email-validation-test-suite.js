#!/usr/bin/env node

/**
 * Email Validation Test Suite
 * Comprehensive testing for all email validation components
 */

import { emailValidation } from './aipm-email-validation.js';

async function runValidationTests() {
  console.log('🧪 Running AIPM Email Validation Test Suite...\n');

  const testCases = [
    { email: 'user@example.com', expected: true, description: 'Valid email' },
    { email: 'test@gmail.com', expected: true, description: 'Common domain' },
    { email: 'invalid-email', expected: false, description: 'Invalid format' },
    { email: '', expected: false, description: 'Empty email' },
    { email: 'user@gmial.com', expected: true, description: 'Typo suggestion test' },
  ];

  let passed = 0;
  let total = testCases.length;

  for (const testCase of testCases) {
    const result = emailValidation.isValid(testCase.email);
    const message = emailValidation.getValidationMessage(testCase.email);
    const success = result === testCase.expected;

    console.log(`Test: ${testCase.description}`);
    console.log(`  Email: ${testCase.email || 'empty'}`);
    console.log(`  Expected: ${testCase.expected}, Got: ${result}`);
    console.log(`  Message: ${message}`);
    console.log(`  ${success ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    if (success) passed++;
  }

  // Test assignee validation
  console.log('Testing assignee validation...');
  const assigneeTests = [
    { email: '', expected: true, description: 'Empty assignee (valid)' },
    { email: 'valid@example.com', expected: true, description: 'Valid assignee' },
    { email: 'invalid', expected: false, description: 'Invalid assignee' },
  ];

  for (const test of assigneeTests) {
    const result = emailValidation.validateAssignee(test.email);
    const success = result.valid === test.expected;
    
    console.log(`  ${test.description}: ${success ? '✅ PASS' : '❌ FAIL'}`);
    if (success) passed++;
  }

  total += assigneeTests.length;

  console.log(`\n📊 Final Results: ${passed}/${total} tests passed`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  return passed === total;
}

async function main() {
  const success = await runValidationTests();
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
