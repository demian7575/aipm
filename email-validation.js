/**
 * Email Validation Utility
 * Provides simple email validation for AIPM forms
 */

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidEmailFormat(email) {
  return validateEmail(email);
}
