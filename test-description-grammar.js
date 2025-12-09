#!/usr/bin/env node

import { generateInvestCompliantStory } from './apps/backend/story-generator.js';

console.log('🧪 Testing Natural Description Generation\n');

const testCases = [
  {
    input: 'add a new feature',
    expected: 'As a User, I want to add a new feature.'
  },
  {
    input: 'I want to add a new feature',
    expected: 'As a User, I want to add a new feature.'
  },
  {
    input: 'Add a new feature',
    expected: 'As a User, I want to add a new feature.'
  },
  {
    input: 'to add a new feature',
    expected: 'As a User, I want to add a new feature.'
  },
  {
    input: 'add a new feature.',
    expected: 'As a User, I want to add a new feature.'
  },
  {
    input: 'auto generated "Description" in User story generated in "Create Child Story" modal is not seems natural',
    expected: 'As a User, I want to auto generated "Description" in User story generated in "Create Child Story" modal is not seems natural.'
  }
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase.input}"`);
  const result = generateInvestCompliantStory(testCase.input);
  const descriptionStart = result.description.split('.')[0] + '.';
  
  if (descriptionStart === testCase.expected) {
    console.log(`✅ PASS: "${descriptionStart}"\n`);
    passed++;
  } else {
    console.log(`❌ FAIL:`);
    console.log(`   Expected: "${testCase.expected}"`);
    console.log(`   Got:      "${descriptionStart}"\n`);
    failed++;
  }
});

// Test with parent story
console.log('Test 7: With parent story');
const parent = { title: 'Parent Feature', asA: 'Developer', components: ['System'] };
const result = generateInvestCompliantStory('implement child feature', { parent });

if (result.description.includes('As a Developer') && 
    result.description.includes('implement child feature') &&
    result.description.includes('parent story "Parent Feature"')) {
  console.log('✅ PASS: Parent story context included correctly\n');
  passed++;
} else {
  console.log('❌ FAIL: Parent story context not included correctly\n');
  console.log(`   Got: "${result.description}"\n`);
  failed++;
}

// Test grammar improvements
console.log('Test 8: Grammar improvements');
const grammarTests = [
  { input: 'I want to fix the bug', shouldNotContain: 'I want to I want to' },
  { input: 'to improve performance', shouldNotContain: 'I want to to' },
  { input: 'Add feature.', shouldNotContain: '..' }
];

grammarTests.forEach((test, idx) => {
  const result = generateInvestCompliantStory(test.input);
  if (!result.description.includes(test.shouldNotContain)) {
    console.log(`✅ PASS: No grammar issue "${test.shouldNotContain}"`);
    passed++;
  } else {
    console.log(`❌ FAIL: Found grammar issue "${test.shouldNotContain}"`);
    console.log(`   In: "${result.description}"`);
    failed++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Description generation is natural.\n');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed.\n');
  process.exit(1);
}
