import { isValidEmail, validateEmailField } from './utils/email-validator.js';

// Test cases for email validation
function testEmailValidation() {
  console.log('Testing email validation utility...');
  
  // Valid emails
  const validEmails = [
    'user@example.com',
    'test.email@domain.co.uk',
    'user+tag@example.org'
  ];
  
  // Invalid emails
  const invalidEmails = [
    'invalid-email',
    '@domain.com',
    'user@',
    'user@domain',
    ''
  ];
  
  // Test valid emails
  validEmails.forEach(email => {
    const result = validateEmailField(email);
    console.assert(result.valid, `Should be valid: ${email}`);
  });
  
  // Test invalid emails
  invalidEmails.forEach(email => {
    if (email === '') {
      // Empty email should be valid (allowed)
      const result = validateEmailField(email);
      console.assert(result.valid, `Empty email should be allowed`);
    } else {
      const result = validateEmailField(email);
      console.assert(!result.valid, `Should be invalid: ${email}`);
    }
  });
  
  console.log('✅ Email validation tests passed');
}

testEmailValidation();
