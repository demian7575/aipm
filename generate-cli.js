#!/usr/bin/env node

// CLI for code generation - PR #732
import { CodeGenerator, generateTestCode } from './code-generator.js';
import { writeFileSync } from 'fs';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node generate-cli.js <type> <name> [params...]');
    process.exit(1);
  }

  const [type, name, ...params] = args;
  const generator = new CodeGenerator();

  try {
    const code = generator.generate(type, name, { params });
    const filename = `generated-${name}.js`;
    const fileContent = generator.generateFile(filename, code);
    
    writeFileSync(filename, fileContent);
    console.log(`✅ Generated ${filename}`);
    console.log(code);
  } catch (error) {
    console.error(`❌ Generation failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
