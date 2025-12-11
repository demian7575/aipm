#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Validating JavaScript syntax...');

const jsFiles = [
  'apps/frontend/public/app.js',
  'apps/backend/app.js'
];

let hasErrors = false;

for (const file of jsFiles) {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${file}`);
    hasErrors = true;
    continue;
  }

  try {
    // Use Node.js to check syntax
    execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
    console.log(`✅ ${file} - syntax OK`);
  } catch (error) {
    console.error(`❌ ${file} - syntax error:`);
    console.error(error.stderr.toString());
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\n💥 Build validation failed - fix syntax errors before deploying');
  process.exit(1);
} else {
  console.log('\n✅ All JavaScript files passed syntax validation');
}
