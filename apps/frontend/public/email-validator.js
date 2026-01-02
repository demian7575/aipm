/**
 * Email Validation Utility for AIPM
 * Provides comprehensive email validation with error handling
 */

class EmailValidator {
  constructor() {
    this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }

  /**
   * Validate email with detailed error reporting
   * @param {string} email - Email to validate
   * @returns {Object} Validation result
   */
  validate(email) {
    try {
      if (!email) {
        return { valid: false, error: 'Email is required' };
      }
      
      if (typeof email !== 'string') {
        return { valid: false, error: 'Email must be a string' };
      }
      
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        return { valid: false, error: 'Email cannot be empty' };
      }
      
      if (!this.emailRegex.test(trimmedEmail)) {
        return { valid: false, error: 'Invalid email format' };
      }
      
      return { valid: true, email: trimmedEmail.toLowerCase() };
    } catch (error) {
      return { valid: false, error: 'Validation error occurred' };
    }
  }

  /**
   * Quick validation check
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  isValid(email) {
    return this.validate(email).valid;
  }
}

// Export for use in AIPM
window.EmailValidator = EmailValidator;
