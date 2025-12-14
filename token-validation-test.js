/**
 * Token validation test
 */

/**
 * Validate JWT token format
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if valid format
 */
function validateTokenFormat(token) {
  try {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    return parts.length === 3;
  } catch (error) {
    return false;
  }
}

/**
 * Validate token expiration
 * @param {string} token - JWT token to validate
 * @returns {boolean} True if not expired
 */
function validateTokenExpiration(token) {
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp && payload.exp > now;
  } catch (error) {
    return false;
  }
}

/**
 * Execute token validation test
 */
function runTokenValidationTest() {
  try {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Lp-38RDyLcG6I2Jb8_5Y5z5z5z5z5z5z5z5z5z5z5z5';
    
    const formatValid = validateTokenFormat(testToken);
    const expirationValid = validateTokenExpiration(testToken);
    
    if (formatValid && expirationValid) {
      console.log('✓ Token validation test PASSED');
      return true;
    } else {
      console.log('✗ Token validation test FAILED');
      return false;
    }
  } catch (error) {
    console.error('Token validation test error:', error.message);
    return false;
  }
}

runTokenValidationTest();
