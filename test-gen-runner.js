#!/usr/bin/env node

// Test Code Generation Runner
import { generateTestCode, generateTestSuite } from './test-code-generation.js';
import { writeFileSync } from 'fs';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node test-gen-runner.js <testName> [testName2...]');
    console.log('       node test-gen-runner.js --suite test1 test2 test3');
    process.exit(1);
  }

  if (args[0] === '--suite') {
    const testNames = args.slice(1);
    const suiteCode = generateTestSuite(testNames);
    const filename = 'generated-test-suite.js';
    
    writeFileSync(filename, suiteCode);
    console.log(`✅ Generated test suite: ${filename}`);
    console.log(`Tests included: ${testNames.join(', ')}`);
  } else {
    const testName = args[0];
    const testCode = generateTestCode(testName);
    const filename = `generated-test-${testName}.js`;
    
    writeFileSync(filename, testCode);
    console.log(`✅ Generated test: ${filename}`);
    console.log('\nGenerated code:');
    console.log(testCode);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
