import { validateEmail, validateEmailList } from './email-validation-utility.js';

function runTests() {
  console.log('🧪 Running Email Validation Tests...\n');
  
  // Test valid emails
  const validEmails = [
    'test@example.com',
    'user.name@domain.co.uk',
    'admin@test-site.org'
  ];
  
  validEmails.forEach(email => {
    const result = validateEmail(email);
    console.log(`✅ ${email}: ${result.valid ? 'PASS' : 'FAIL'}`);
  });
  
  // Test invalid emails
  const invalidEmails = [
    '',
    'invalid-email',
    '@domain.com',
    'user@',
    'user@domain',
    null,
    123
  ];
  
  invalidEmails.forEach(email => {
    const result = validateEmail(email);
    console.log(`❌ ${email}: ${result.valid ? 'FAIL' : 'PASS'} - ${result.error || ''}`);
  });
  
  // Test email list validation
  const emailList = ['valid@test.com', 'invalid-email', 'another@valid.com'];
  const listResult = validateEmailList(emailList);
  console.log(`\n📋 List validation: ${listResult.valid ? 'PASS' : 'PARTIAL'}`);
  console.log(`Valid emails: ${listResult.validEmails.join(', ')}`);
  if (listResult.errors) {
    console.log(`Errors: ${listResult.errors.join(', ')}`);
  }
  
  console.log('\n✅ Email validation tests completed');
}

runTests();
