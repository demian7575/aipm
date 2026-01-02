function validateEmail(email) {
  try {
    if (!email) {
      throw new Error('Email is required');
    }
    
    if (typeof email !== 'string') {
      throw new Error('Email must be a string');
    }
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      throw new Error('Email cannot be empty');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format');
    }
    
    return { valid: true, email: trimmedEmail };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export { validateEmail };
