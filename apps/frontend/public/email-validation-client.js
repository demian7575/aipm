/**
 * Email validation integration for AIPM frontend
 * Client-side validation utilities
 */

// Import validation functions (in real implementation, these would be imported)
function validateEmailAddress(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email must be a non-empty string' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true, email: email.toLowerCase() };
}

// AIPM-specific assignee validation
function validateAssigneeEmailAddress(email) {
  if (!email || email.trim() === '') {
    return { valid: true, email: '' };
  }
  
  return validateEmailAddress(email.trim());
}

// Add visual feedback for email validation in AIPM forms
function addEmailValidationToInput(inputElement) {
  if (!inputElement) return;
  
  inputElement.addEventListener('blur', function() {
    const email = this.value.trim();
    const validation = validateAssigneeEmailAddress(email);
    
    if (!validation.valid && email !== '') {
      this.style.borderColor = '#dc3545';
      this.title = validation.error;
    } else {
      this.style.borderColor = email ? '#28a745' : '';
      this.title = email ? 'Valid email address' : '';
    }
  });
}

// Export for use in AIPM
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateEmailAddress,
    validateAssigneeEmailAddress,
    addEmailValidationToInput
  };
}
