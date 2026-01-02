#!/usr/bin/env node

// PR #584 Validation Generator CLI
import { ValidationCodeGenerator } from './pr584-implementation.js';
import { writeFileSync } from 'fs';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node pr584-cli.js <type> [field]');
    console.log('Types: email, required, number');
    process.exit(1);
  }

  const [type, field = 'Field'] = args;
  const generator = new ValidationCodeGenerator();

  try {
    const code = generator.generateValidator(type, field);
    const filename = `validator-${type}-${field.toLowerCase()}.js`;
    
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
