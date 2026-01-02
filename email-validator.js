/**
 * Email validation utility with proper error handling
 */

export function validateEmailWithErrors(email) {
  try {
    if (email === null || email === undefined) {
      return { isValid: false, error: 'Email is required' };
    }
    
    if (typeof email !== 'string') {
      return { isValid: false, error: 'Email must be a string' };
    }
    
    const trimmed = email.trim();
    if (trimmed === '') {
      return { isValid: false, error: 'Email cannot be empty' };
    }
    
    if (trimmed.length > 254) {
      return { isValid: false, error: 'Email is too long (max 254 characters)' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { isValid: false, error: 'Invalid email format' };
    }
    
    return { isValid: true, error: null };
  } catch (err) {
    return { isValid: false, error: 'Validation error occurred' };
  }
}
