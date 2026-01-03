import { validateEmail, isValidEmail } from './email-validation-pr765.js';

// Test the email validation utility
function testEmailValidation() {
  console.log('Testing email validation for PR #765...');
  
  const testCases = [
    { email: 'user@example.com', expected: true },
    { email: 'invalid-email', expected: false },
    { email: '', expected: true }, // Empty allowed
    { email: 'test@domain.co.uk', expected: true },
    { email: '@domain.com', expected: false }
  ];
  
  testCases.forEach(({ email, expected }) => {
    const result = isValidEmail(email);
    console.assert(result === expected, `Failed for: ${email}`);
    console.log(`✅ ${email || '(empty)'} - ${result ? 'Valid' : 'Invalid'}`);
  });
  
  console.log('✅ Email validation tests completed');
}

testEmailValidation();
