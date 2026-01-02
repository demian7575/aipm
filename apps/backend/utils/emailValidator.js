/**
 * Email validation utility
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 * @throws {Error} If email is invalid or missing
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email.trim())) {
    throw new Error('Invalid email format');
  }
  
  return true;
}

export { validateEmail };
