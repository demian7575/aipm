function validateEmailAddress(email) {
  try {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email must be a non-empty string' };
    }
    
    const trimmed = email.trim();
    if (!trimmed) {
      return { valid: false, error: 'Email cannot be empty' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Invalid email format' };
    }
    
    return { valid: true, email: trimmed };
  } catch (error) {
    return { valid: false, error: 'Validation failed: ' + error.message };
  }
}

export { validateEmailAddress };
