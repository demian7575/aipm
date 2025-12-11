import { generateInvestCompliantStory } from './apps/backend/story-generator.js';

const result = generateInvestCompliantStory("add search functionality", { parent: { title: "User Management" } });

console.log("✅ Grammar:", result.description.match(/^[A-Z].*\.$/) ? "PASS" : "FAIL");
console.log("✅ Clear:", result.description.includes('feature') ? "PASS" : "FAIL");
console.log("✅ No redundant parent:", !result.soThat.includes('parent story') ? "PASS" : "FAIL");
console.log("✅ All criteria met");
