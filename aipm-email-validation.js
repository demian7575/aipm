/**
 * AIPM Email Validation Integration
 * Final integration module for seamless email validation across AIPM
 */

import { EnhancedEmailValidator } from './apps/backend/utils/enhancedEmailValidation.js';

export class AIPMEmailValidation {
  constructor() {
    this.validator = new EnhancedEmailValidator();
  }

  /**
   * Validate email for AIPM forms
   * @param {string} email - Email to validate
   * @returns {Object} Validation result
   */
  validateForForm(email) {
    return this.validator.validateEnhanced(email, {
      suggestCorrections: true,
      blockDisposable: false
    });
  }

  /**
   * Validate assignee email (optional field)
   * @param {string} assigneeEmail - Assignee email
   * @returns {Object} Validation result
   */
  validateAssignee(assigneeEmail) {
    if (!assigneeEmail || !assigneeEmail.trim()) {
      return { valid: true, email: null, message: 'Assignee is optional' };
    }
    return this.validateForForm(assigneeEmail);
  }

  /**
   * Quick validation for API endpoints
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  isValid(email) {
    const result = this.validator.validate(email);
    return result.valid;
  }

  /**
   * Get validation message for UI display
   * @param {string} email - Email to validate
   * @returns {string} User-friendly message
   */
  getValidationMessage(email) {
    const result = this.validateForForm(email);
    
    if (result.valid) {
      let message = '✅ Valid email';
      if (result.suggestions && result.suggestions.length > 0) {
        message += ` (Did you mean ${result.suggestions[0]}?)`;
      }
      return message;
    }
    
    return `❌ ${result.error}`;
  }
}

// Create singleton instance for AIPM
export const emailValidation = new AIPMEmailValidation();
