import { validateEmailWithErrors } from './email-validator.js';

console.log('Testing Email Validator with Error Handling...');

const tests = [
  { input: 'test@example.com', expected: true },
  { input: null, expected: false },
  { input: undefined, expected: false },
  { input: 123, expected: false },
  { input: '', expected: false },
  { input: '   ', expected: false },
  { input: 'invalid', expected: false },
  { input: '@domain.com', expected: false },
  { input: 'a'.repeat(250) + '@test.com', expected: false }
];

tests.forEach((test, i) => {
  const result = validateEmailWithErrors(test.input);
  const status = result.isValid === test.expected ? 'PASS' : 'FAIL';
  console.log(`Test ${i + 1}: ${status} - ${result.error || 'Valid email'}`);
});

console.log('Email validator test completed.');
