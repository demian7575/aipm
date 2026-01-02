// Test email validation utility for AIPM context
import { validateEmail, validateAssigneeEmail, validateTaskAssigneeEmail } from './email-validation.js';

function runTests() {
  console.log('Testing AIPM Email Validation Utility...\n');

  // Test basic email validation
  console.log('1. Basic Email Validation:');
  console.log(validateEmail('user@example.com')); // Should be valid
  console.log(validateEmail('invalid-email')); // Should be invalid
  console.log(validateEmail('')); // Should be invalid
  console.log('');

  // Test assignee email validation (optional)
  console.log('2. Assignee Email Validation:');
  console.log(validateAssigneeEmail('assignee@company.com')); // Should be valid
  console.log(validateAssigneeEmail('')); // Should be valid (optional)
  console.log(validateAssigneeEmail('bad-email')); // Should be invalid
  console.log('');

  // Test task assignee email validation (required)
  console.log('3. Task Assignee Email Validation:');
  console.log(validateTaskAssigneeEmail('task.owner@company.com')); // Should be valid
  console.log(validateTaskAssigneeEmail('')); // Should be invalid (required)
  console.log(validateTaskAssigneeEmail('invalid')); // Should be invalid
}

runTests();
