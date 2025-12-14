/**
 * Token validation test module
 * @description Validates authentication tokens
 */

/**
 * Validates JWT token structure
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if valid structure
 */
function isValidTokenStructure(token) {
  try {
    return token && typeof token === 'string' && token.split('.').length === 3;
  } catch (error) {
    console.error('Token structure validation error:', error);
    return false;
  }
}

/**
 * Validates token expiration
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if not expired
 */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp && payload.exp < Math.floor(Date.now() / 1000);
  } catch (error) {
    console.error('Token expiration check error:', error);
    return true;
  }
}

/**
 * Validates authentication token
 * @param {string} token - Token to validate
 * @returns {Object} Validation result
 */
function validateAuthToken(token) {
  try {
    const structureValid = isValidTokenStructure(token);
    const expired = structureValid ? isTokenExpired(token) : true;
    
    return {
      valid: structureValid && !expired,
      structure: structureValid,
      expired: expired
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, structure: false, expired: true };
  }
}

/**
 * Run token validation tests
 * @returns {boolean} Test result
 */
function runTokenTests() {
  try {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjo5OTk5OTk5OTk5fQ.test';
    const result = validateAuthToken(testToken);
    
    console.log('Token validation test:', result.valid ? 'PASS' : 'FAIL');
    return result.valid;
  } catch (error) {
    console.error('Token test error:', error);
    return false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateAuthToken, runTokenTests };
}
