#!/usr/bin/env node
import { generateInvestCompliantStory } from './apps/backend/story-generator.js';

const story = generateInvestCompliantStory('add user authentication');
const parent = { title: 'User Management', asA: 'Admin' };
const story2 = generateInvestCompliantStory('manage roles', { parent });

const tests = [
  ['Title is clear', story.title.length > 0 && story.title.length <= 120],
  ['Description detailed', story.description.length > 50],
  ['"I want" clear', story.iWant === 'add user authentication'],
  ['"So that" meaningful', story.soThat.includes('accomplish')],
  ['AC includes requirement', story.acceptanceCriteria.some(ac => ac.includes('requirement'))],
  ['Parent in soThat', story2.soThat.includes('parent story')],
  ['Description structured', story.description.includes('As a') && story.description.includes('I want to')]
];

let p = 0;
tests.forEach(([n, r]) => {
  console.log(`${r ? '✅' : '❌'} ${n}`);
  if (r) p++;
});

console.log(`\n${p}/${tests.length} passed\n`);
process.exit(p === tests.length ? 0 : 1);
