// Test email validation for AIPM context
import { validateEmail, validateAssigneeEmail, validateTaskAssigneeEmail, validateEmailWithToast } from './email-util.js';

function runEmailUtilTests() {
  console.log('Testing AIPM Email Validation Utility...\n');

  // Test 1: Basic email validation
  console.log('1. Basic Email Validation:');
  console.log('Valid:', validateEmail('user@company.com'));
  console.log('Invalid:', validateEmail('invalid-email'));
  console.log('Empty:', validateEmail(''));
  console.log('');

  // Test 2: Assignee email validation (optional)
  console.log('2. User Story Assignee Email (Optional):');
  console.log('Valid assignee:', validateAssigneeEmail('assignee@company.com'));
  console.log('Empty assignee (valid):', validateAssigneeEmail(''));
  console.log('Invalid assignee:', validateAssigneeEmail('bad-email'));
  console.log('');

  // Test 3: Task assignee email validation (required)
  console.log('3. Task Assignee Email (Required):');
  console.log('Valid task assignee:', validateTaskAssigneeEmail('task.owner@company.com'));
  console.log('Empty task assignee (invalid):', validateTaskAssigneeEmail(''));
  console.log('Invalid task assignee:', validateTaskAssigneeEmail('invalid'));
  console.log('');

  // Test 4: Toast integration
  console.log('4. Toast Integration:');
  const mockToast = (message, type) => console.log(`Toast [${type}]: ${message}`);
  console.log('Valid with toast:', validateEmailWithToast('valid@email.com', 'Assignee Email', mockToast));
  console.log('Invalid with toast:', validateEmailWithToast('invalid', 'Assignee Email', mockToast));
}

runEmailUtilTests();
