/**
 * Enhanced Email Validation Utility for AIPM
 * Comprehensive email validation with advanced features
 */

export class EnhancedEmailValidator {
  constructor() {
    this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    this.commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    this.disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
  }

  /**
   * Enhanced email validation with detailed analysis
   * @param {string} email - Email to validate
   * @param {Object} options - Validation options
   * @returns {Object} Detailed validation result
   */
  validateEnhanced(email, options = {}) {
    const basicValidation = this.validate(email);
    if (!basicValidation.valid) {
      return basicValidation;
    }

    const domain = this.extractDomain(email);
    const result = {
      ...basicValidation,
      domain,
      isCommonDomain: this.commonDomains.includes(domain),
      isDisposable: this.disposableDomains.includes(domain),
      suggestions: []
    };

    // Add domain suggestions for typos
    if (options.suggestCorrections) {
      result.suggestions = this.getSuggestions(domain);
    }

    // Check for disposable email if required
    if (options.blockDisposable && result.isDisposable) {
      return { valid: false, error: 'Disposable email addresses are not allowed' };
    }

    return result;
  }

  /**
   * Basic email validation (compatible with existing code)
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

  /**
   * Get domain suggestions for common typos
   * @param {string} domain - Domain to check
   * @returns {Array} Array of suggested domains
   */
  getSuggestions(domain) {
    const suggestions = [];
    const commonTypos = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'outlok.com': 'outlook.com'
    };

    if (commonTypos[domain]) {
      suggestions.push(commonTypos[domain]);
    }

    return suggestions;
  }

  /**
   * Validate multiple emails with detailed results
   * @param {Array} emails - Array of emails to validate
   * @param {Object} options - Validation options
   * @returns {Object} Batch validation results
   */
  validateBatch(emails, options = {}) {
    if (!Array.isArray(emails)) {
      return { valid: false, error: 'Input must be an array' };
    }

    const results = emails.map(email => this.validateEnhanced(email, options));
    const valid = results.filter(r => r.valid);
    const invalid = results.filter(r => !r.valid);

    return {
      total: emails.length,
      valid: valid.length,
      invalid: invalid.length,
      results,
      validEmails: valid.map(r => r.email),
      errors: invalid.map(r => r.error)
    };
  }
}

// Utility functions for backward compatibility
export function validateEmail(email) {
  const validator = new EnhancedEmailValidator();
  const result = validator.validate(email);
  if (!result.valid) {
    throw new Error(result.error);
  }
  return result.email;
}

export function safeValidateEmail(email) {
  try {
    return { valid: true, email: validateEmail(email), error: null };
  } catch (error) {
    return { valid: false, email: null, error: error.message };
  }
}
