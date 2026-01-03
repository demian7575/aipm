/**
 * Enhanced Email Validation Utility for PR #54
 * Comprehensive email validation with proper error handling for AIPM system
 */

function validateEmail(email) {
  try {
    // Handle null/undefined (allowed in AIPM)
    if (email === null || email === undefined) {
      return { valid: true, email: '', error: null };
    }
    
    // Type validation
    if (typeof email !== 'string') {
      return { valid: false, error: 'Email must be a string', email: null };
    }
    
    const trimmed = email.trim();
    
    // Empty string validation (allowed in AIPM)
    if (!trimmed) {
      return { valid: true, email: '', error: null };
    }
    
    // Length validation
    if (trimmed.length > 254) {
      return { valid: false, error: 'Email address too long (max 254 characters)', email: trimmed };
    }
    
    // Format validation with enhanced regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Invalid email format', email: trimmed };
    }
    
    return { valid: true, email: trimmed, error: null };
    
  } catch (error) {
    return { 
      valid: false, 
      error: `Email validation error: ${error.message}`, 
      email: null 
    };
  }
}

function isValidEmail(email) {
  try {
    return validateEmail(email).valid;
  } catch (error) {
    return false;
  }
}

function sanitizeEmail(email) {
  try {
    const result = validateEmail(email);
    return result.valid ? result.email : '';
  } catch (error) {
    return '';
  }
}

export { validateEmail, isValidEmail, sanitizeEmail };
