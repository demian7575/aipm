/**
 * Email Validation Utility
 * Provides comprehensive email validation for the AIPM system
 */
class EmailValidator {
  constructor() {
    // RFC 5322 compliant email regex (simplified but robust)
    this.emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  }

  /**
   * Validates an email address
   * @param {string} email - The email address to validate
   * @returns {Object} - Validation result with valid boolean and error message
   */
  validate(email) {
    try {
      // Check if email is provided
      if (!email) {
        return { valid: false, error: 'Email is required' };
      }

      // Check if email is a string
      if (typeof email !== 'string') {
        return { valid: false, error: 'Email must be a string' };
      }

      // Trim whitespace
      email = email.trim();

      // Check for empty string after trim
      if (email.length === 0) {
        return { valid: false, error: 'Email cannot be empty' };
      }

      // Check length constraints
      if (email.length > 254) {
        return { valid: false, error: 'Email too long (max 254 characters)' };
      }

      // Check for basic format
      if (!this.emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format' };
      }

      // Additional checks
      const parts = email.split('@');
      if (parts.length !== 2) {
        return { valid: false, error: 'Email must contain exactly one @ symbol' };
      }

      const [localPart, domain] = parts;

      // Check local part length
      if (localPart.length > 64) {
        return { valid: false, error: 'Local part too long (max 64 characters)' };
      }

      // Check domain part
      if (domain.length === 0) {
        return { valid: false, error: 'Domain part cannot be empty' };
      }

      // Check for consecutive dots
      if (email.includes('..')) {
        return { valid: false, error: 'Email cannot contain consecutive dots' };
      }

      // Check for leading/trailing dots
      if (localPart.startsWith('.') || localPart.endsWith('.')) {
        return { valid: false, error: 'Local part cannot start or end with a dot' };
      }

      return { valid: true, error: null };
      
    } catch (error) {
      return { valid: false, error: 'Validation error occurred' };
    }
  }

  /**
   * Quick validation method that returns boolean only
   * @param {string} email - The email address to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValid(email) {
    return this.validate(email).valid;
  }
}

// Make EmailValidator available globally
if (typeof window !== 'undefined') {
  window.EmailValidator = EmailValidator;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailValidator;
}

// Export as ES module default
export default EmailValidator;
