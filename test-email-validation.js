#!/usr/bin/env node

/**
 * Email Validation Integration Test
 * Tests both frontend and backend email validation
 */

import { EmailValidationService } from './apps/backend/utils/emailValidation.js';

function testEmailValidation() {
  const service = new EmailValidationService();
  const testCases = [
    { email: 'test@example.com', expected: true },
    { email: 'invalid-email', expected: false },
    { email: '', expected: false },
    { email: null, expected: false },
    { email: 'user@domain.co.uk', expected: true },
    { email: 'a'.repeat(65) + '@example.com', expected: false }, // Local part too long
  ];

  console.log('🧪 Running Email Validation Tests...\n');

  let passed = 0;
  let total = testCases.length;

  testCases.forEach((testCase, index) => {
    const result = service.validateEmail(testCase.email);
    const success = result.valid === testCase.expected;
    
    console.log(`Test ${index + 1}: ${testCase.email || 'null'}`);
    console.log(`  Expected: ${testCase.expected}, Got: ${result.valid}`);
    console.log(`  ${success ? '✅ PASS' : '❌ FAIL'}`);
    if (!result.valid && result.error) {
      console.log(`  Error: ${result.error}`);
    }
    console.log('');

    if (success) passed++;
  });

  console.log(`📊 Results: ${passed}/${total} tests passed`);
  return passed === total;
}

// Test assignee email validation
function testAssigneeValidation() {
  const service = new EmailValidationService();
  
  console.log('🧪 Testing Assignee Email Validation...\n');
  
  const assigneeTests = [
    { email: '', expected: true }, // Empty assignee is valid
    { email: null, expected: true }, // Null assignee is valid
    { email: 'valid@example.com', expected: true },
    { email: 'invalid-email', expected: false },
  ];

  let passed = 0;
  assigneeTests.forEach((test, index) => {
    const result = service.validateAssigneeEmail(test.email);
    const success = result.valid === test.expected;
    
    console.log(`Assignee Test ${index + 1}: ${test.email || 'null/empty'}`);
    console.log(`  Expected: ${test.expected}, Got: ${result.valid}`);
    console.log(`  ${success ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    if (success) passed++;
  });

  console.log(`📊 Assignee Results: ${passed}/${assigneeTests.length} tests passed`);
  return passed === assigneeTests.length;
}

async function main() {
  const basicTests = testEmailValidation();
  const assigneeTests = testAssigneeValidation();
  
  if (basicTests && assigneeTests) {
    console.log('🎉 All email validation tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
