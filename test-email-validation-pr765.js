import { validateEmail, isValidEmail, validateEmailForForm, sanitizeEmail } from './email-validation-pr765.js';

// Comprehensive test suite for enhanced email validation
function testEmailValidation() {
  console.log('Testing enhanced email validation for PR #765...');
  
  const testCases = [
    // Valid cases
    { email: 'user@example.com', expected: true, desc: 'Standard email' },
    { email: 'test.email@domain.co.uk', expected: true, desc: 'Email with dots and country TLD' },
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
    const result = isValidEmail(email);
    const detailed = validateEmail(email);
    
    console.assert(result === expected, `Failed for: ${desc}`);
    console.log(`${result === expected ? '✅' : '❌'} ${desc} - ${result ? 'Valid' : 'Invalid'}`);
    
    if (!result && detailed.error) {
      console.log(`   Error: ${detailed.error}`);
    }
  });
  
  // Test form validation
  console.log('\nTesting form validation...');
  const requiredResult = validateEmailForForm('', true);
  console.assert(!requiredResult.valid, 'Required validation should fail for empty');
  console.log(`✅ Required validation works: ${requiredResult.error}`);
  
  // Test sanitization
  console.log('\nTesting email sanitization...');
  const sanitized = sanitizeEmail('  user@example.com  ');
  console.assert(sanitized === 'user@example.com', 'Should trim whitespace');
  console.log(`✅ Sanitization works: "${sanitized}"`);
  
  console.log('\n🎉 All email validation tests completed successfully');
}

testEmailValidation();
