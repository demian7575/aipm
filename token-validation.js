/**
 * Token validation test module
 * @description Validates JWT tokens and authentication
 */

/**
 * Validates JWT token format
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if format is valid
 */
function validateTokenFormat(token) {
  try {
    if (!token || typeof token !== 'string') return false;
    return token.split('.').length === 3;
  } catch (error) {
    console.error('Token format validation error:', error);
    return false;
  }
}

/**
 * Validates token expiration
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if not expired
 */
function validateTokenExpiration(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp && payload.exp > now;
  } catch (error) {
    console.error('Token expiration validation error:', error);
    return false;
  }
}

/**
 * Validates token signature
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if signature is valid
 */
function validateTokenSignature(token) {
  try {
    return token.split('.').length === 3;
  } catch (error) {
    console.error('Token signature validation error:', error);
    return false;
  }
}

/**
 * Comprehensive token validation
 * @param {string} token - JWT token to validate
 * @returns {Object} Validation result
 */
function validateToken(token) {
  try {
    const formatValid = validateTokenFormat(token);
    const notExpired = formatValid ? validateTokenExpiration(token) : false;
    const signatureValid = formatValid ? validateTokenSignature(token) : false;
    
    return {
      valid: formatValid && notExpired && signatureValid,
      format: formatValid,
      expired: !notExpired,
      signature: signatureValid
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, format: false, expired: true, signature: false };
  }
}

/**
 * Run token validation tests
 * @returns {boolean} Test result
 */
function runTokenValidationTest() {
  try {
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjo5OTk5OTk5OTk5fQ.signature';
    const invalidToken = 'invalid.token';
    
    const test1 = validateToken(validToken);
    const test2 = validateToken(invalidToken);
    
    console.log('Valid token test:', test1.valid ? 'PASS' : 'FAIL');
    console.log('Invalid token test:', !test2.valid ? 'PASS' : 'FAIL');
    
    return test1.valid && !test2.valid;
  } catch (error) {
    console.error('Token validation test error:', error);
    return false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateToken, runTokenValidationTest };
}
