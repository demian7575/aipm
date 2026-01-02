/**
 * Enhanced Email Validation Utility for AIPM
 * Provides comprehensive email validation with error handling and integration
 */

class EmailValidator {
  constructor() {
    this.emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  }

  validate(email) {
    try {
      if (!email) {
        return { valid: false, error: 'Email is required' };
      }

      if (typeof email !== 'string') {
        return { valid: false, error: 'Email must be a string' };
      }

      const trimmedEmail = email.trim();
      
      if (trimmedEmail.length === 0) {
        return { valid: false, error: 'Email cannot be empty' };
      }

      if (trimmedEmail.length > 254) {
        return { valid: false, error: 'Email is too long' };
      }

      if (!this.emailRegex.test(trimmedEmail)) {
        return { valid: false, error: 'Invalid email format' };
      }

      return { 
        valid: true, 
        email: trimmedEmail.toLowerCase(),
        normalized: trimmedEmail.toLowerCase()
      };
    } catch (error) {
      return { valid: false, error: 'Validation error occurred' };
    }
  }

  validateMultiple(emails) {
    if (!Array.isArray(emails)) {
      return { valid: false, error: 'Input must be an array' };
    }

    const results = emails.map(email => this.validate(email));
    const validEmails = results.filter(r => r.valid).map(r => r.normalized);
    const errors = results.filter(r => !r.valid).map(r => r.error);

    return {
      valid: errors.length === 0,
      validEmails,
      errors,
      count: validEmails.length
    };
  }
}

// Global instance
const emailValidator = new EmailValidator();

// Utility functions for AIPM integration
function validateAssigneeEmail(email) {
  return emailValidator.validate(email);
}

function validateEmailField(inputElement) {
  if (!inputElement) return { valid: false, error: 'Input element not found' };
  
  const result = emailValidator.validate(inputElement.value);
  
  // Visual feedback
  inputElement.classList.toggle('invalid', !result.valid);
  inputElement.classList.toggle('valid', result.valid);
  
  return result;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EmailValidator, emailValidator, validateAssigneeEmail, validateEmailField };
}

// Global availability
window.EmailValidator = EmailValidator;
window.emailValidator = emailValidator;
window.validateAssigneeEmail = validateAssigneeEmail;
window.validateEmailField = validateEmailField;
