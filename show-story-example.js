#!/usr/bin/env node
import { generateInvestCompliantStory } from './apps/backend/story-generator.js';

const story = generateInvestCompliantStory('implement user profile editing feature');
console.log('Generated Story Example:');
console.log('========================');
console.log('Title:', story.title);
console.log('As a:', story.asA);
console.log('I want:', story.iWant);
console.log('So that:', story.soThat);
console.log('\nDescription:', story.description);
console.log('\nAcceptance Criteria:');
story.acceptanceCriteria.forEach((ac, i) => console.log(`  ${i+1}. ${ac}`));
