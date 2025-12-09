#!/usr/bin/env node
import { generateInvestCompliantStory } from './apps/backend/story-generator.js';

console.log('🧪 Testing Improved Story Generation\n');

const tests = [];

// Test 1: Title is clear and concise
const story1 = generateInvestCompliantStory('add user authentication feature');
tests.push(['Title is clear', story1.title.length > 0 && story1.title.length <= 120]);
console.log(`Title: "${story1.title}"`);

// Test 2: Description is detailed
tests.push(['Description is detailed', story1.description.length > 50]);
console.log(`Description length: ${story1.description.length} chars`);

// Test 3: "I want" is clear
tests.push(['"I want" is clear', story1.iWant.length > 0]);
console.log(`I want: "${story1.iWant}"`);

// Test 4: "So that" is meaningful
tests.push(['"So that" is meaningful', story1.soThat.includes('accomplish')]);
console.log(`So that: "${story1.soThat}"`);

// Test 5: Acceptance criteria includes requirement
tests.push(['AC includes requirement', story1.acceptanceCriteria.some(ac => ac.includes('requirement'))]);
console.log(`AC count: ${story1.acceptanceCriteria.length}`);

// Test 6: With parent story context
const parent = { title: 'User Management', asA: 'Administrator' };
const story2 = generateInvestCompliantStory('manage user roles', { parent });
tests.push(['Parent context in soThat', story2.soThat.includes('parent story')]);
console.log(`\nWith parent - So that: "${story2.soThat}"`);

// Test 7: Description is unambiguous
tests.push(['Description has structure', 
  story1.description.includes('As a') && 
  story1.description.includes('I want to') && 
  story1.description.includes('This ensures')
]);

console.log('\n' + '='.repeat(60));
let p = 0;
tests.forEach(([n, r]) => {
  console.log(`${r ? '✅' : '❌'} ${n}`);
  if (r) p++;
});

console.log(`\n${p}/${tests.length} passed\n`);
process.exit(p === tests.length ? 0 : 1);
