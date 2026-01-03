/**
 * Email Validation Utility
 * Provides email validation functionality for the AIPM system
 */

function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function validateEmailField(email) {
  const trimmed = email ? email.trim() : '';
  
  if (!trimmed) {
    return { valid: true, message: '' }; // Empty is allowed
  }
  
  if (isValidEmail(trimmed)) {
    return { valid: true, message: '' };
  }
  
  return { valid: false, message: 'Please enter a valid email address' };
}

export { isValidEmail, validateEmailField };
