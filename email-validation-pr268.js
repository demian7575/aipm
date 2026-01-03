/**
 * Email Validation Utility for PR #268
 * Provides email validation functionality for AIPM system
 */

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }
  
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: true, email: '' }; // Empty allowed in AIPM
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true, email: trimmed };
}

function isValidEmail(email) {
  return validateEmail(email).valid;
}

export { validateEmail, isValidEmail };
