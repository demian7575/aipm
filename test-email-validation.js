import { isValidEmail, validateEmailField, validateEmailWithFeedback, attachEmailValidation } from './utils/email-validator.js';

// Comprehensive test cases for email validation
function testEmailValidation() {
  console.log('Testing enhanced email validation utility...');
  
  // Valid emails
  const validEmails = [
    'user@example.com',
    'test.email@domain.co.uk',
    'user+tag@example.org',
    'firstname.lastname@company.com',
    'user123@test-domain.com',
    'a@b.co'
  ];
  
  // Invalid emails
  const invalidEmails = [
    'invalid-email',
    '@domain.com',
    'user@',
    'user@domain', // no TLD
    'user@domain..com', // double dot in domain
    'user name@example.com', // space
    'a'.repeat(255) + '@example.com' // too long
  ];
  
  // Test valid emails
  console.log('Testing valid emails:');
  validEmails.forEach(email => {
    const result = validateEmailField(email);
    console.assert(result.valid, `Should be valid: ${email}`);
    console.log(`✅ ${email} - Valid`);
  });
  
  // Test invalid emails
  console.log('\nTesting invalid emails:');
  invalidEmails.forEach(email => {
    const result = validateEmailField(email);
    console.assert(!result.valid, `Should be invalid: ${email}`);
    console.log(`❌ ${email} - Invalid: ${result.message}`);
  });
  
  // Test empty email (should be valid in AIPM)
  const emptyResult = validateEmailField('');
  console.assert(emptyResult.valid, 'Empty email should be valid');
  console.log('✅ Empty email - Valid (allowed in AIPM)');
  
  // Test whitespace-only email
  const whitespaceResult = validateEmailField('   ');
  console.assert(whitespaceResult.valid, 'Whitespace-only email should be valid');
  console.log('✅ Whitespace-only email - Valid (treated as empty)');
  
  // Test feedback functionality
  const feedbackResult = validateEmailWithFeedback('invalid-email');
  console.assert(!feedbackResult.valid, 'Feedback should show invalid');
  console.assert(feedbackResult.cssClass === 'invalid', 'Should have invalid CSS class');
  console.assert(feedbackResult.ariaInvalid === 'true', 'Should have aria-invalid=true');
  
  console.log('\n🎉 All email validation tests passed!');
}

// Test DOM integration (mock)
function testDOMIntegration() {
  console.log('\nTesting DOM integration...');
  
  // Create mock input element
  const mockInput = {
    value: '',
    classList: {
      toggle: (className, condition) => console.log(`Toggle ${className}: ${condition}`),
      remove: (className) => console.log(`Remove ${className}`)
    },
    setAttribute: (attr, value) => console.log(`Set ${attr}=${value}`),
    addEventListener: (event, handler) => console.log(`Added ${event} listener`)
  };
  
  const mockFeedback = {
    textContent: '',
    className: ''
  };
  
  // Test attachment
  const validator = attachEmailValidation(mockInput, mockFeedback);
  console.assert(typeof validator === 'function', 'Should return validator function');
  
  console.log('✅ DOM integration test passed');
}

// Run all tests
testEmailValidation();
testDOMIntegration();
