import { generateInvestCompliantStory } from './apps/backend/story-generator.js';

// Test story generation meets acceptance criteria
const testIdea = "add validation to form fields";
const context = { parent: { title: "Form Management", asA: "User" } };

const result = generateInvestCompliantStory(testIdea, context);

console.log("✅ Story Generation Test");
console.log(`Title: ${result.title}`);
console.log(`Description: ${result.description}`);
console.log(`I want: ${result.iWant}`);
console.log(`So that: ${result.soThat}`);

// Check acceptance criteria
const hasGoodGrammar = result.description.match(/^[A-Z].*\.$/) && !result.description.includes('enables enables');
const noRedundantParent = !result.soThat.includes('parent story') || testIdea.includes('parent');

console.log(`✅ AT-1765329702568-1: Grammar correct - ${hasGoodGrammar}`);
console.log(`✅ AT-1765329702568-2: No redundant parent refs - ${noRedundantParent}`);
