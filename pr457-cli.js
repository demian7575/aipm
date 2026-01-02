#!/usr/bin/env node

// PR #457 Dynamic Test CLI
import { DynamicTestGenerator } from './pr457-implementation.js';
import { writeFileSync } from 'fs';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node pr457-cli.js <type> <name> [testFunction]');
    console.log('Types: unit, integration');
    process.exit(1);
  }

  const [type, name, testFunction] = args;
  const generator = new DynamicTestGenerator();

  if (testFunction) {
    generator.configure(name, { testFunction });
  }

  try {
    const code = generator.generate(type, name);
    const filename = `dynamic-test-${name}.js`;
    
    writeFileSync(filename, code);
    console.log(`✅ Generated ${filename}`);
    console.log('\nGenerated code:');
    console.log(code);
  } catch (error) {
    console.error(`❌ Generation failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
