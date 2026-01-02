export function validateEmail(email) {
  try {
    if (!email || typeof email !== 'string') {
      throw new Error('Email must be a non-empty string');
    }
    
    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      throw new Error('Email cannot be empty');
    }
    
    if (trimmedEmail.length > 254) {
      throw new Error('Email address too long');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format');
    }
    
    return { valid: true, email: trimmedEmail.toLowerCase() };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export function validateEmailList(emails) {
  if (!Array.isArray(emails)) {
    return { valid: false, error: 'Input must be an array' };
  }
  
  const results = emails.map(email => validateEmail(email));
  const validEmails = results.filter(r => r.valid).map(r => r.email);
  const errors = results.filter(r => !r.valid).map(r => r.error);
  
  return {
    valid: errors.length === 0,
    validEmails,
    errors: errors.length > 0 ? errors : undefined
  };
}
