/**
 * Frontend Email Validation Utility
 * Client-side email validation with real-time feedback
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
    if (!email) {
      return { valid: false, error: 'Email is required' };
    }
    
    if (typeof email !== 'string') {
      return { valid: false, error: 'Email must be a string' };
    }
    
    const trimmed = email.trim();
    if (!trimmed) {
      return { valid: false, error: 'Email cannot be empty' };
    }
    
    if (!this.emailRegex.test(trimmed)) {
      return { valid: false, error: 'Invalid email format' };
    }
    
    return { valid: true, email: trimmed.toLowerCase() };
  }

  /**
   * Quick validation check
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  isValid(email) {
    return this.validate(email).valid;
  }

  /**
   * Add real-time validation to input field
   * @param {HTMLInputElement} inputElement - Input element to validate
   * @param {Function} callback - Callback for validation result
   */
  addRealTimeValidation(inputElement, callback) {
    if (!inputElement) return;

    inputElement.addEventListener('input', () => {
      const result = this.validate(inputElement.value);
      if (callback) callback(result);
      
      // Visual feedback
      inputElement.classList.toggle('invalid', !result.valid);
      inputElement.classList.toggle('valid', result.valid);
    });
  }

  /**
   * Validate multiple emails at once
   * @param {Array} emails - Array of emails to validate
   * @returns {Array} Array of validation results
   */
  validateBatch(emails) {
    if (!Array.isArray(emails)) {
      return [{ valid: false, error: 'Input must be an array' }];
    }
    return emails.map(email => this.validate(email));
  }
}

// Export for use in AIPM
window.EmailValidator = EmailValidator;
