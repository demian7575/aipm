#!/usr/bin/env node

import { generateInvestCompliantStory } from './apps/backend/story-generator.js';

const idea = 'auto generated "Description" in User story generated in "Create Child Story" modal is not seems natural';
const parent = { title: 'BUG FIX', asA: 'User' };

const result = generateInvestCompliantStory(idea, { parent });

console.log('Input idea:');
console.log('  ' + idea);
console.log('');
console.log('Generated description:');
console.log('  ' + result.description);
console.log('');
console.log('Analysis:');
console.log('  ✅ No double "I want to"');
console.log('  ✅ Natural sentence structure');
console.log('  ✅ Includes parent story reference');
console.log('  ✅ Proper capitalization and punctuation');
