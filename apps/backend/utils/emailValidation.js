/**
 * Email Validation Backend Utility
 * Server-side email validation for AIPM API
 */

class EmailValidationService {
  constructor() {
    this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }

  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Invalid email input' };
    }

    const trimmed = email.trim();
    if (!this.emailRegex.test(trimmed)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true, email: trimmed.toLowerCase() };
  }

  validateAssigneeEmail(assigneeEmail) {
    if (!assigneeEmail) {
      return { valid: true, email: null }; // Optional field
    }
    return this.validateEmail(assigneeEmail);
  }
}

module.exports = { EmailValidationService };
