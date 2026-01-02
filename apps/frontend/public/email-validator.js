/**
 * Frontend Email Validator for AIPM
 * Client-side email validation with comprehensive error handling
 */

class EmailValidator {
  constructor() {
    this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {Object} Validation result with valid boolean and error message
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

    if (trimmed.length > 254) {
      return { valid: false, error: 'Email too long (max 254 characters)' };
    }

    if (!this.emailRegex.test(trimmed)) {
      return { valid: false, error: 'Invalid email format' };
    }

    const [localPart, domain] = trimmed.split('@');
    
    if (localPart.length > 64) {
      return { valid: false, error: 'Local part too long (max 64 characters)' };
    }

    if (!this.domainRegex.test(domain)) {
      return { valid: false, error: 'Invalid domain format' };
    }

    return { valid: true, email: trimmed.toLowerCase() };
  }

  /**
   * Validate assignee email (optional field)
   * @param {string} assigneeEmail - Assignee email to validate
   * @returns {Object} Validation result
   */
  validateAssignee(assigneeEmail) {
    if (!assigneeEmail || !assigneeEmail.trim()) {
      return { valid: true, email: null };
    }
    return this.validate(assigneeEmail);
  }

  /**
   * Extract domain from email
   * @param {string} email - Email address
   * @returns {string|null} Domain or null if invalid
   */
  extractDomain(email) {
    const validation = this.validate(email);
    if (!validation.valid) {
      return null;
    }
    return validation.email.split('@')[1];
  }
}

// Make EmailValidator available globally
window.EmailValidator = EmailValidator;
