function validateEmail(email) {
  try {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required and must be a string' };
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
    return { valid: false, error: 'Email validation failed: ' + error.message };
  }
}

export { validateEmail };
