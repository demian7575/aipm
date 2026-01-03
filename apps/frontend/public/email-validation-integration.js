/**
 * Email Validation Integration for AIPM Frontend
 * Integrates email validation utility with the AIPM user interface
 */

import { isValidEmail, validateEmailField, validateEmailWithFeedback, attachEmailValidation } from '../../utils/email-validator.js';

// Initialize email validation for all email inputs in the application
function initializeEmailValidation() {
  // Find all email inputs and attach validation
  const emailInputs = document.querySelectorAll('input[type="email"]');
  
  emailInputs.forEach(input => {
    // Create feedback element if it doesn't exist
    let feedbackElement = input.nextElementSibling;
    if (!feedbackElement || !feedbackElement.classList.contains('validation-feedback')) {
      feedbackElement = document.createElement('span');
      feedbackElement.className = 'validation-feedback';
      input.parentNode.insertBefore(feedbackElement, input.nextSibling);
    }
    
    // Attach validation
    attachEmailValidation(input, feedbackElement);
  });
}

// Validate email before form submission
function validateEmailBeforeSubmit(email) {
  const result = validateEmailField(email);
  if (!result.valid && result.email) {
    // Only show error if email is not empty
    return { isValid: false, message: result.message };
  }
  return { isValid: true, message: '' };
}

// Utility function to validate assignee email in story forms
function validateAssigneeEmail(email) {
  return validateEmailBeforeSubmit(email);
}

// Export functions for use in main app
window.EmailValidation = {
  isValidEmail,
  validateEmailField,
  validateEmailWithFeedback,
  attachEmailValidation,
  initializeEmailValidation,
  validateEmailBeforeSubmit,
  validateAssigneeEmail
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEmailValidation);
} else {
  initializeEmailValidation();
}

export {
  isValidEmail,
  validateEmailField,
  validateEmailWithFeedback,
  attachEmailValidation,
  initializeEmailValidation,
  validateEmailBeforeSubmit,
  validateAssigneeEmail
};
