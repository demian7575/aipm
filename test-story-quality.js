#!/usr/bin/env node
import { generateInvestCompliantStory } from './apps/backend/story-generator.js';

console.log('🧪 Testing Story Generation Quality\n');

// Test 1: Basic idea without parent reference
const story1 = generateInvestCompliantStory('add user login functionality');
console.log('Test 1 - Basic idea:');
console.log(`  Title: "${story1.title}"`);
console.log(`  I want: "${story1.iWant}"`);
console.log(`  So that: "${story1.soThat}"`);
console.log(`  Description: "${story1.description}"`);

// Test 2: Idea that mentions parent
const parent = { title: 'User Management', asA: 'Administrator' };
const story2 = generateInvestCompliantStory('add login to support user management system', { parent });
console.log('\nTest 2 - Idea mentioning parent:');
console.log(`  So that: "${story2.soThat}"`);

// Test 3: Idea that doesn't mention parent
const story3 = generateInvestCompliantStory('create dashboard widgets', { parent });
console.log('\nTest 3 - Idea not mentioning parent:');
console.log(`  So that: "${story3.soThat}"`);

const tests = [
  ['Grammar correct', story1.description.includes('As a') && story1.description.includes('I want to')],
  ['No redundant parent ref', !story3.soThat.includes('User Management')],
  ['Parent ref when mentioned', story2.soThat.includes('User Management')],
  ['Clean I want', story1.iWant === 'add user login functionality'],
  ['Proper capitalization', story1.iWant.charAt(0) === story1.iWant.charAt(0).toLowerCase()],
  ['AC uses clean idea', story1.acceptanceCriteria[1].includes('add user login functionality')],
  ['No generic parent text', !story3.description.includes('This work supports')]
];

console.log('\n' + '='.repeat(60));
let p = 0;
tests.forEach(([n, r]) => {
  console.log(`${r ? '✅' : '❌'} ${n}`);
  if (r) p++;
});

console.log(`\n${p}/${tests.length} passed\n`);
process.exit(p === tests.length ? 0 : 1);
