function validateEmail(email) {
  try {
    if (!email || typeof email !== 'string') {
      throw new Error('Email must be a non-empty string');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    
    return { valid: true, email: email.trim() };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export { validateEmail };
