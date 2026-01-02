/**
 * Email Validation Service for AIPM Backend
 * Provides server-side email validation with comprehensive error handling
 */

class EmailValidationService {
  constructor() {
    this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {Object} Validation result
   */
  validateEmail(email) {
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
   * Validate assignee email (optional field)
   * @param {string} assigneeEmail - Assignee email to validate
   * @returns {Object} Validation result
   */
  validateAssigneeEmail(assigneeEmail) {
    if (!assigneeEmail) {
      return { valid: true, email: null };
    }
    return this.validateEmail(assigneeEmail);
  }

  /**
   * Batch validate multiple emails
   * @param {Array} emails - Array of emails to validate
   * @returns {Array} Array of validation results
   */
  validateEmails(emails) {
    if (!Array.isArray(emails)) {
      return [{ valid: false, error: 'Input must be an array' }];
    }

    return emails.map(email => this.validateEmail(email));
  }

  /**
   * Validate email with domain restrictions
   * @param {string} email - Email to validate
   * @param {Array} allowedDomains - Array of allowed domains
   * @returns {Object} Validation result
   */
  validateEmailWithDomains(email, allowedDomains = []) {
    const basicValidation = this.validateEmail(email);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    if (allowedDomains.length > 0) {
      const domain = basicValidation.email.split('@')[1];
      if (!allowedDomains.includes(domain)) {
        return { valid: false, error: 'Domain not allowed' };
      }
    }

    return basicValidation;
  }
}

module.exports = { EmailValidationService };
