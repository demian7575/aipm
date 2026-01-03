/**
 * Email Validation Utility
 * Provides comprehensive email validation functionality for the AIPM system
 */

function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmed = email.trim();
  if (!trimmed) {
    return false;
  }
  
  // Enhanced email regex that handles more edge cases
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

function validateEmailField(email) {
  const trimmed = email ? email.trim() : '';
  
  if (!trimmed) {
    return { valid: true, message: '', email: '' }; // Empty is allowed in AIPM
  }
  
  if (trimmed.length > 254) {
    return { valid: false, message: 'Email address is too long (max 254 characters)', email: trimmed };
  }
  
  if (isValidEmail(trimmed)) {
    return { valid: true, message: '', email: trimmed };
  }
  
  return { valid: false, message: 'Please enter a valid email address', email: trimmed };
}

function validateEmailWithFeedback(email, showSuccess = false) {
  const result = validateEmailField(email);
  
  return {
    ...result,
    cssClass: result.valid ? (showSuccess ? 'valid' : '') : 'invalid',
    ariaInvalid: result.valid ? 'false' : 'true'
  };
}

// Real-time validation for input fields
function attachEmailValidation(inputElement, feedbackElement = null) {
  if (!inputElement) return;
  
  const validateAndUpdate = () => {
    const result = validateEmailWithFeedback(inputElement.value);
    
    // Update input styling
    inputElement.classList.toggle('invalid', !result.valid);
    inputElement.setAttribute('aria-invalid', result.ariaInvalid);
    
    // Update feedback message
    if (feedbackElement) {
      feedbackElement.textContent = result.message;
      feedbackElement.className = `validation-feedback ${result.cssClass}`;
    }
    
    return result;
  };
  
  inputElement.addEventListener('blur', validateAndUpdate);
  inputElement.addEventListener('input', () => {
    // Clear invalid state on input, validate on blur
    inputElement.classList.remove('invalid');
    if (feedbackElement) {
      feedbackElement.textContent = '';
    }
  });
  
  return validateAndUpdate;
}

export { isValidEmail, validateEmailField, validateEmailWithFeedback, attachEmailValidation };
