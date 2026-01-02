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
 * Validates assignee email for user stories (optional field)
 */
function validateAssigneeEmail(email) {
  if (!email || !email.trim()) {
    return { valid: true, email: '', optional: true };
  }
  
  const result = validateEmail(email);
  return result.valid 
    ? { ...result, optional: false }
    : { ...result, message: `Invalid assignee: ${result.error}` };
}

/**
 * Validates task assignee email (required field)
 */
function validateTaskAssigneeEmail(email) {
  const result = validateEmail(email);
  return result.valid
    ? { ...result, required: true }
    : { ...result, message: `Task assignee required: ${result.error}` };
}

/**
 * AIPM-specific email validation with toast integration
 */
function validateEmailWithToast(email, fieldName = 'Email', showToast = null) {
  const result = validateEmail(email);
  
  if (!result.valid && showToast) {
    showToast(`${fieldName}: ${result.error}`, 'error');
  }
  
  return result;
}

export { validateEmail, validateAssigneeEmail, validateTaskAssigneeEmail, validateEmailWithToast };
