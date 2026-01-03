/**
 * Email Validation Utility for PR #715
 * Enhanced with comprehensive error handling for AIPM system
 */

function validateEmail(email) {
  try {
    // Handle null, undefined, empty - all allowed in AIPM
    if (email === null || email === undefined || email === '') {
      return { valid: true, email: email === null ? null : email === undefined ? undefined : '', normalized: '' };
    }
    
    if (typeof email !== 'string') {
      return { 
        valid: false, 
        error: 'Email must be a string, null, undefined, or empty',
        errorCode: 'INVALID_TYPE',
        received: typeof email
      };
    }
    
    const trimmed = email.trim();
    if (!trimmed) {
      return { valid: true, email: '', normalized: '' };
    }
    
    // Enhanced regex from conversation summary
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    
    if (!emailRegex.test(trimmed)) {
      return { 
        valid: false, 
        error: 'Invalid email format - must contain @ symbol and valid domain',
        errorCode: 'INVALID_FORMAT',
        email: trimmed
      };
    }
    
    return { valid: true, email: trimmed, normalized: trimmed.toLowerCase() };
    
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error.message}`,
      errorCode: 'VALIDATION_ERROR',
      originalError: error
    };
  }
}

function isValidEmail(email) {
  return validateEmail(email).valid;
}

function normalizeEmail(email) {
  const result = validateEmail(email);
  return result.valid ? result.normalized || result.email : null;
}

export { validateEmail, isValidEmail, normalizeEmail };
