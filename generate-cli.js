#!/usr/bin/env node

// Enhanced CLI for AIPM code generation
import { AIPMCodeGenerator } from './test-code-gen.js';
import { writeFileSync } from 'fs';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node generate-cli.js <type> <name> [options...]');
    console.log('Types: test, story-test, api-test');
    console.log('Examples:');
    console.log('  node generate-cli.js test UserValidation');
    console.log('  node generate-cli.js story-test 123');
    console.log('  node generate-cli.js api-test /api/stories');
    process.exit(1);
  }

  const [type, name, ...options] = args;
  const generator = new AIPMCodeGenerator();

  try {
    const opts = {};
    if (type === 'test' && options.length > 0) {
      opts.description = options.join(' ');
    }
    if (type === 'api-test' && options.length > 0) {
      opts.method = options[0];
    }

    const code = generator.generate(type, name, opts);
    const filename = `generated-${type}-${name.replace(/[^a-zA-Z0-9]/g, '')}.js`;
    
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
