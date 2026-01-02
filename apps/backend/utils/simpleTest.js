/**
 * Simple test function
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @returns {boolean} True if values match
 */
function simpleTest(actual, expected) {
  return actual === expected;
}

/**
 * Test branch validation function
 * @returns {boolean} Always returns true for basic validation
 */
function validateTestBranch() {
  return true;
}

export { simpleTest, validateTestBranch };
