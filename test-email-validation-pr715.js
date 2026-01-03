import { validateEmail, isValidEmail, normalizeEmail } from './email-validation-pr715.js';

// Enhanced test suite with comprehensive error handling tests
function testEmailValidation() {
  console.log('Testing enhanced email validation for PR #715...');
  
  const testCases = [
    // Valid cases
    { email: 'user@example.com', expected: true, description: 'Standard email' },
    { email: 'test@domain.co.uk', expected: true, description: 'Multi-level domain' },
    { email: 'user.name+tag@example.org', expected: true, description: 'Complex valid email' },
    
    // AIPM-specific valid cases
    { email: '', expected: true, description: 'Empty string (AIPM allows)' },
    { email: null, expected: true, description: 'Null value (AIPM allows)' },
    { email: undefined, expected: true, description: 'Undefined value (AIPM allows)' },
    { email: '   ', expected: true, description: 'Whitespace only' },
    
    // Invalid cases
    { email: 'invalid-email', expected: false, description: 'No @ symbol' },
    { email: '@domain.com', expected: false, description: 'Missing local part' },
    { email: 'user@', expected: false, description: 'Missing domain' },
    { email: 'user@domain', expected: false, description: 'Missing TLD' },
    { email: 123, expected: false, description: 'Number input' },
    { email: {}, expected: false, description: 'Object input' },
    { email: [], expected: false, description: 'Array input' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach(({ email, expected, description }) => {
    try {
      const result = isValidEmail(email);
      const detailed = validateEmail(email);
      
      if (result === expected) {
        console.log(`✅ ${description}: ${email === null ? 'null' : email === undefined ? 'undefined' : `"${email}"`} - ${result ? 'Valid' : 'Invalid'}`);
        passed++;
      } else {
        console.log(`❌ ${description}: Expected ${expected}, got ${result}`);
        failed++;
      }
      
      if (!result && detailed.error) {
        console.log(`   Error: ${detailed.error} (Code: ${detailed.errorCode || 'N/A'})`);
      }
      
      if (result && detailed.normalized) {
        console.log(`   Normalized: ${detailed.normalized}`);
      }
      
    } catch (error) {
      console.log(`❌ ${description}: Test threw error - ${error.message}`);
      failed++;
    }
  });
  
  // Test normalization function
  console.log('\nTesting email normalization...');
  const normalizationTests = [
    { input: 'User@Example.COM', expected: 'user@example.com' },
    { input: '', expected: '' },
    { input: null, expected: null },
    { input: 'invalid', expected: null }
  ];
  
  normalizationTests.forEach(({ input, expected }) => {
    const result = normalizeEmail(input);
    const match = result === expected;
    console.log(`${match ? '✅' : '❌'} Normalize "${input}": ${result} ${match ? '' : `(expected ${expected})`}`);
    if (match) passed++; else failed++;
  });
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed');
  
  return { passed, failed, success: failed === 0 };
}

// Run tests
const results = testEmailValidation();
process.exit(results.success ? 0 : 1);
