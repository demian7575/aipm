#!/usr/bin/env node
import { generateInvestCompliantStory } from './apps/backend/story-generator.js';

console.log('Edge Case Tests:');

const test1 = generateInvestCompliantStory('I want to create a dashboard');
const test2 = generateInvestCompliantStory('add search feature.');
const test3 = generateInvestCompliantStory('Create User Profile');

console.log('1. With prefix:', test1.iWant);
console.log('2. With period:', test2.iWant);
console.log('3. Capitalization:', test3.iWant);

const tests = [
  ['Removes prefix', test1.iWant === 'create a dashboard'],
  ['Removes period', test2.iWant === 'add search feature'],
  ['Proper case', test3.iWant === 'create User Profile']
];

let p = 0;
tests.forEach(([n, r]) => {
  console.log(`${r ? '✅' : '❌'} ${n}`);
  if (r) p++;
});

console.log(`\n${p}/${tests.length} edge cases passed`);
