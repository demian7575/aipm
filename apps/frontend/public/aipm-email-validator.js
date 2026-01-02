/**
 * AIPM Email Validation Integration
 * Integrates enhanced email validation with AIPM forms
 */

// Enhanced frontend email validator with AIPM integration
class AIPMEmailValidator extends EmailValidator {
  constructor() {
    super();
    this.commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    this.disposableDomains = ['10minutemail.com', 'tempmail.org'];
  }

  /**
   * Validate email with AIPM-specific enhancements
   * @param {string} email - Email to validate
   * @param {Object} options - Validation options
   * @returns {Object} Enhanced validation result
   */
  validateWithSuggestions(email, options = {}) {
    const basicResult = this.validate(email);
    if (!basicResult.valid) {
      return basicResult;
    }

    const domain = this.extractDomain(email);
    const suggestions = this.getDomainSuggestions(domain);

    return {
      ...basicResult,
      domain,
      suggestions,
      isCommonDomain: this.commonDomains.includes(domain),
      isDisposable: this.disposableDomains.includes(domain)
    };
  }

  /**
   * Get domain suggestions for common typos
   * @param {string} domain - Domain to check
   * @returns {Array} Suggested corrections
   */
  getDomainSuggestions(domain) {
    const suggestions = [];
    const typos = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'outlok.com': 'outlook.com'
    };

    if (typos[domain]) {
      suggestions.push(typos[domain]);
    }

    return suggestions;
  }

  /**
   * Show validation feedback in AIPM UI
   * @param {HTMLElement} inputElement - Email input element
   * @param {string} email - Email to validate
   */
  showValidationFeedback(inputElement, email) {
    const result = this.validateWithSuggestions(email);
    const feedbackElement = inputElement.parentNode.querySelector('.email-feedback') || 
                           this.createFeedbackElement(inputElement);

    if (result.valid) {
      feedbackElement.className = 'email-feedback valid';
      feedbackElement.textContent = '✅ Valid email';
      
      if (result.suggestions.length > 0) {
        feedbackElement.textContent += ` (Did you mean ${result.suggestions[0]}?)`;
      }
    } else {
      feedbackElement.className = 'email-feedback invalid';
      feedbackElement.textContent = `❌ ${result.error}`;
    }
  }

  /**
   * Create feedback element for email validation
   * @param {HTMLElement} inputElement - Email input element
   * @returns {HTMLElement} Feedback element
   */
  createFeedbackElement(inputElement) {
    const feedback = document.createElement('div');
    feedback.className = 'email-feedback';
    inputElement.parentNode.appendChild(feedback);
    return feedback;
  }
}

// Replace the global EmailValidator with enhanced version
window.EmailValidator = AIPMEmailValidator;

// Add CSS for feedback styling
const style = document.createElement('style');
style.textContent = `
.email-feedback {
  font-size: 0.8em;
  margin-top: 0.25rem;
  padding: 0.25rem;
  border-radius: 3px;
}
.email-feedback.valid {
  color: #28a745;
  background-color: #d4edda;
}
.email-feedback.invalid {
  color: #dc3545;
  background-color: #f8d7da;
}
`;
document.head.appendChild(style);
