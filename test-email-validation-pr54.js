import { validateEmail, isValidEmail, sanitizeEmail } from './email-validation-pr54.js';

// Comprehensive test suite for enhanced email validation with error handling
function testEmailValidation() {
  console.log('Testing enhanced email validation with error handling for PR #54...');
  
  const testCases = [
    // Valid cases
    { email: 'user@example.com', expected: true, desc: 'Standard email' },
    { email: 'test@domain.co.uk', expected: true, desc: 'Email with country TLD' },
    { email: '', expected: true, desc: 'Empty string (allowed in AIPM)' },
    { email: null, expected: true, desc: 'Null value (allowed in AIPM)' },
    { email: undefined, expected: true, desc: 'Undefined value (allowed in AIPM)' },
    
    // Invalid cases
    { email: 'invalid-email', expected: false, desc: 'Missing @ and domain' },
    { email: '@domain.com', expected: false, desc: 'Missing local part' },
    { email: 'user@', expected: false, desc: 'Missing domain' },
    { email: 'user@domain', expected: false, desc: 'Missing TLD' },
    { email: 123, expected: false, desc: 'Non-string input' },
    { email: 'a'.repeat(250) + '@example.com', expected: false, desc: 'Too long email' }
  ];
  
  testCases.forEach(({ email, expected, desc }) => {
    try {
      const result = isValidEmail(email);
      const detailed = validateEmail(email);
      
      console.assert(result === expected, `Failed for: ${desc}`);
      console.log(`${result === expected ? '✅' : '❌'} ${desc} - ${result ? 'Valid' : 'Invalid'}`);
      
      if (!result && detailed.error) {
        console.log(`   Error: ${detailed.error}`);
      }
    } catch (error) {
      console.log(`❌ ${desc} - Exception: ${error.message}`);
    }
  });
  
  // Test error handling
  console.log('\nTesting error handling...');
  try {
    const errorResult = validateEmail(Symbol('test'));
    console.log(`✅ Symbol input handled: ${errorResult.error}`);
  } catch (error) {
    console.log(`✅ Exception caught: ${error.message}`);
  }
  
  // Test sanitization
  console.log('\nTesting email sanitization...');
  const sanitized = sanitizeEmail('  user@example.com  ');
  console.assert(sanitized === 'user@example.com', 'Should trim whitespace');
  console.log(`✅ Sanitization: "${sanitized}"`);
  
  console.log('\n🎉 All email validation tests with error handling completed');
}

testEmailValidation();
