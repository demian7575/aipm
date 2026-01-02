/**
 * Email Validation Utility with Error Handling
 * Integrated with AIPM project for assignee email validation
 */
function validateEmail(email) {
  try {
    if (!email || typeof email !== 'string') {
      throw new Error('Email must be a non-empty string');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    return { valid: true, email: email.toLowerCase() };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate assignee email for AIPM stories and tasks
 * Allows empty emails as they are optional in AIPM
 */
function validateAssigneeEmail(email) {
  if (!email || email.trim() === '') {
    return { valid: true, email: '' };
  }
  
  return validateEmail(email.trim());
}

module.exports = { validateEmail, validateAssigneeEmail };
