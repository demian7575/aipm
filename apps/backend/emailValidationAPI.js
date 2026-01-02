/**
 * Email Validation API Endpoint
 * REST API for email validation services
 */

import { EmailValidationService } from './utils/emailValidation.js';

export class EmailValidationAPI {
  constructor() {
    this.validator = new EmailValidationService();
  }

  /**
   * Handle single email validation
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  validateSingle(req, res) {
    try {
      const { email } = req.body;
      const result = this.validator.validateEmail(email);
      res.json(result);
    } catch (error) {
      res.status(400).json({ valid: false, error: error.message });
    }
  }

  /**
   * Handle batch email validation
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  validateBatch(req, res) {
    try {
      const { emails } = req.body;
      const results = this.validator.validateEmails(emails);
      res.json({ results });
    } catch (error) {
      res.status(400).json({ valid: false, error: error.message });
    }
  }

  /**
   * Handle assignee email validation (for AIPM stories)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  validateAssignee(req, res) {
    try {
      const { assigneeEmail } = req.body;
      const result = this.validator.validateAssigneeEmail(assigneeEmail);
      res.json(result);
    } catch (error) {
      res.status(400).json({ valid: false, error: error.message });
    }
  }
}
