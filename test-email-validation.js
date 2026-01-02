// Test file for email validation utility
import { validateEmail, isValidEmailFormat } from './email-validation.js';

console.log('Testing Email Validation Utility...');

// Test cases
const testCases = [
  { email: 'test@example.com', expected: true },
  { email: 'user.name@domain.co.uk', expected: true },
  { email: 'invalid-email', expected: false },
  { email: '@domain.com', expected: false },
  { email: 'test@', expected: false },
  { email: '', expected: false },
  { email: null, expected: false },
  { email: undefined, expected: false }
];

let passed = 0;
let total = testCases.length;

testCases.forEach((test, index) => {
  const result = validateEmail(test.email);
  const status = result === test.expected ? 'PASS' : 'FAIL';
  console.log(`Test ${index + 1}: ${test.email || 'null/undefined'} -> ${status}`);
  if (result === test.expected) passed++;
});

console.log(`\nResults: ${passed}/${total} tests passed`);
console.log('Email validation utility test completed.');
