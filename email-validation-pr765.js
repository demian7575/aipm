/**
 * Enhanced Email Validation Utility for PR #765
 * Provides comprehensive email validation functionality for AIPM system
 */

function validateEmail(email) {
  try {
    if (email === null || email === undefined) {
      return { valid: true, email: '', error: null }; // Null/undefined allowed in AIPM
    }
    
    if (typeof email !== 'string') {
      return { valid: false, error: 'Email must be a string', email: null };
    }
    
    const trimmed = email.trim();
    if (!trimmed) {
      return { valid: true, email: '', error: null }; // Empty allowed in AIPM
    }
    
    // Enhanced email regex with better validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    
    if (trimmed.length > 254) {
      return { valid: false, error: 'Email address too long (max 254 characters)', email: trimmed };
    }
    
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Invalid email format', email: trimmed };
    }
    
    return { valid: true, email: trimmed, error: null };
  } catch (error) {
    return { valid: false, error: `Validation error: ${error.message}`, email: null };
  }
}

function isValidEmail(email) {
  return validateEmail(email).valid;
}

function validateEmailForForm(email, required = false) {
  const result = validateEmail(email);
  
  if (required && (!result.email || result.email === '')) {
    return { valid: false, error: 'Email is required', email: result.email };
  }
  
  return result;
}

function sanitizeEmail(email) {
  const result = validateEmail(email);
  return result.valid ? result.email : '';
}

export { validateEmail, isValidEmail, validateEmailForForm, sanitizeEmail };
