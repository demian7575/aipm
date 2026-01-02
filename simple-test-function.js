/**
 * Simple test function implementation
 */
function simpleTestFunction() {
  return 'Test passed';
}

/**
 * Enhanced simple test with validation
 */
function runSimpleTest() {
  try {
    const result = simpleTestFunction();
    return {
      status: 'success',
      result: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { simpleTestFunction, runSimpleTest };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.simpleTestFunction = simpleTestFunction;
  window.runSimpleTest = runSimpleTest;
}
