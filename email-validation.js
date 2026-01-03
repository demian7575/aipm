function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new Error('Email must be a non-empty string');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }
    
    return true;
}

module.exports = { validateEmail };
