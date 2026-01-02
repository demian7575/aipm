/**
 * Email Validation API Endpoint
 * REST API for email validation services
 */

const { EmailValidationService } = require('./utils/emailValidation');

class EmailValidationAPI {
  constructor() {
    this.validator = new EmailValidationService();
  }

  /**
   * Handle single email validation
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  validateSingle(req, res) {
    const { email } = req.body;
    const result = this.validator.validateEmail(email);
    res.json(result);
  }

  /**
   * Handle batch email validation
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  validateBatch(req, res) {
    const { emails } = req.body;
    const results = this.validator.validateEmails(emails);
    res.json({ results });
  }

  /**
   * Handle domain-restricted email validation
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  validateWithDomains(req, res) {
    const { email, allowedDomains } = req.body;
    const result = this.validator.validateEmailWithDomains(email, allowedDomains);
    res.json(result);
  }
}

module.exports = { EmailValidationAPI };
