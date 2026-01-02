/**
 * Email Validation API Middleware
 * Express middleware for email validation in AIPM API endpoints
 */

import { emailValidation } from '../aipm-email-validation.js';

/**
 * Middleware to validate email fields in request body
 * @param {Array} fields - Array of field names to validate
 * @param {Object} options - Validation options
 */
export function validateEmailFields(fields = ['email'], options = {}) {
  return (req, res, next) => {
    const errors = [];

    for (const field of fields) {
      const email = req.body[field];
      
      if (email) {
        const result = emailValidation.validateForForm(email);
        if (!result.valid) {
          errors.push({
            field,
            message: result.error,
            suggestions: result.suggestions || []
          });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        valid: false,
        errors,
        message: 'Email validation failed'
      });
    }

    next();
  };
}

/**
 * Middleware to validate assignee email (optional field)
 */
export function validateAssigneeEmail() {
  return (req, res, next) => {
    const assigneeEmail = req.body.assigneeEmail;
    
    if (assigneeEmail) {
      const result = emailValidation.validateAssignee(assigneeEmail);
      if (!result.valid) {
        return res.status(400).json({
          valid: false,
          field: 'assigneeEmail',
          message: result.error
        });
      }
    }

    next();
  };
}
