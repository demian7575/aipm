/**
 * Enhanced Simple Test Functions
 * Extended test utilities for AIPM validation
 */

function simpleTest() {
  return true;
}

function testEquals(actual, expected) {
  return actual === expected;
}

function testNotNull(value) {
  return value !== null && value !== undefined;
}

function testIsArray(value) {
  return Array.isArray(value);
}

function testStringContains(str, substring) {
  return typeof str === 'string' && str.includes(substring);
}

module.exports = {
  simpleTest,
  testEquals,
  testNotNull,
  testIsArray,
  testStringContains
};
