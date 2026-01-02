// Email Validation Utility with Error Handling
function validateEmail(email) {
  if (!email) {
    throw new Error('Email is required');
  }
  
  if (typeof email !== 'string') {
    throw new Error('Email must be a string');
  }
  
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error('Email cannot be empty');
  }
  
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(trimmed)) {
    throw new Error('Invalid email format');
  }
  
  return trimmed.toLowerCase();
}

function safeValidateEmail(email) {
  try {
    return { valid: true, email: validateEmail(email), error: null };
  } catch (error) {
    return { valid: false, email: null, error: error.message };
  }
}

export { validateEmail, safeValidateEmail };
