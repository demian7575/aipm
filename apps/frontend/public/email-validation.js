/**
 * Email validation integration for AIPM frontend
 */

// Client-side email validation
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

// AIPM assignee validation (allows empty)
function validateAssigneeEmailAddress(email) {
  if (!email || email.trim() === '') {
    return { valid: true, email: '' };
  }
  
  return validateEmailAddress(email.trim());
}

// Add validation to input fields
function addEmailValidation(inputElement) {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateEmailAddress,
    validateAssigneeEmailAddress,
    addEmailValidation
  };
}
