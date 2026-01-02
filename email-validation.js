/**
 * Email validation utility for AIPM project
 * Validates assignee emails in user stories and tasks
 */

function validateEmail(email) {
  try {
    if (!email) {
      throw new Error('Email is required');
    }
    
    if (typeof email !== 'string') {
      throw new Error('Email must be a string');
    }
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      throw new Error('Email cannot be empty');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format');
    }
    
    return { valid: true, email: trimmedEmail };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validates assignee email for user stories
 * Returns validation result with specific messaging for AIPM context
 */
function validateAssigneeEmail(email) {
  if (!email || !email.trim()) {
    return { valid: true, email: '', message: 'No assignee specified' };
  }
  
  const result = validateEmail(email);
  if (!result.valid) {
    return { ...result, message: `Invalid assignee email: ${result.error}` };
  }
  
  return { ...result, message: 'Valid assignee email' };
}

/**
 * Validates task assignee email (required for tasks)
 */
function validateTaskAssigneeEmail(email) {
  const result = validateEmail(email);
  if (!result.valid) {
    return { ...result, message: `Task assignee email error: ${result.error}` };
  }
  
  return { ...result, message: 'Valid task assignee email' };
}

export { validateEmail, validateAssigneeEmail, validateTaskAssigneeEmail };
