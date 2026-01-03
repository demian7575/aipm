import { validateEmail, isValidEmail } from './email-validation-pr221.js';

// Test the email validation utility
function testEmailValidation() {
  console.log('Testing email validation for PR #221...');
  
  const testCases = [
    { email: 'user@example.com', expected: true },
    { email: 'test@domain.co.uk', expected: true },
    { email: '', expected: true }, // Empty allowed
    { email: 'invalid-email', expected: false },
    { email: '@domain.com', expected: false },
    { email: 'user@', expected: false }
  ];
  
  testCases.forEach(({ email, expected }) => {
    const result = isValidEmail(email);
    const detailed = validateEmail(email);
    
    console.assert(result === expected, `Failed for: ${email}`);
    console.log(`${result === expected ? '✅' : '❌'} ${email || '(empty)'} - ${result ? 'Valid' : 'Invalid'}`);
    
    if (!result && detailed.error) {
      console.log(`   Error: ${detailed.error}`);
    }
  });
  
  console.log('✅ Email validation tests completed');
}

testEmailValidation();
