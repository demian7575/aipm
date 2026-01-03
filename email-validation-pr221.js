/**
 * Enhanced Email Validation Utility for PR #221
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

function validateEmailWithFeedback(email, required = false) {
  try {
    const result = validateEmail(email);
    
    if (required && (!result.email || result.email === '')) {
      return { 
        valid: false, 
        error: 'Email is required', 
        email: result.email,
        cssClass: 'invalid'
      };
    }
    
    return {
      ...result,
      cssClass: result.valid ? 'valid' : 'invalid'
    };
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error.message}`,
      email: null,
      cssClass: 'invalid'
    };
  }
}

export { validateEmail, isValidEmail, sanitizeEmail, validateEmailWithFeedback };
