#!/usr/bin/env node

import { startServer } from './apps/backend/app.js';
import http from 'http';
import { readFile } from 'fs/promises';

console.log('🧪 Testing Version Display Feature\n');

const server = await startServer(4002);
console.log('✅ Server started\n');

// Test 1: Version endpoint returns correct data
console.log('Test 1: Checking /api/version endpoint...');
const versionData = await new Promise((resolve) => {
  http.get('http://localhost:4002/api/version', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  });
});

const pkg = JSON.parse(await readFile('./package.json', 'utf-8'));
if (versionData.version === pkg.version) {
  console.log(`✅ Version matches package.json: ${versionData.version}\n`);
} else {
  console.log(`❌ Version mismatch: ${versionData.version} vs ${pkg.version}\n`);
  process.exit(1);
}

// Test 2: Check HTML has version display element
console.log('Test 2: Checking HTML for version display...');
const html = await readFile('./apps/frontend/public/index.html', 'utf-8');
if (html.includes('id="version-display"')) {
  console.log('✅ Version display element exists in HTML\n');
} else {
  console.log('❌ Version display element not found in HTML\n');
  process.exit(1);
}

// Test 3: Check CSS has version styling
console.log('Test 3: Checking CSS for version styling...');
const css = await readFile('./apps/frontend/public/styles.css', 'utf-8');
if (css.includes('.version-display')) {
  console.log('✅ Version display styling exists in CSS\n');
} else {
  console.log('❌ Version display styling not found in CSS\n');
  process.exit(1);
}

// Test 4: Check JavaScript has fetchVersion function
console.log('Test 4: Checking JavaScript for fetchVersion function...');
const js = await readFile('./apps/frontend/public/app.js', 'utf-8');
if (js.includes('async function fetchVersion()') && js.includes('fetchVersion()')) {
  console.log('✅ fetchVersion function exists and is called\n');
} else {
  console.log('❌ fetchVersion function not properly implemented\n');
  process.exit(1);
}

// Test 5: Verify PR number extraction logic
console.log('Test 5: Verifying PR number extraction...');
const backendCode = await readFile('./apps/backend/app.js', 'utf-8');
if (backendCode.includes('prMatch = branch.match(/pr[_-]?(\\d+)/i)')) {
  console.log('✅ PR number extraction logic exists\n');
} else {
  console.log('❌ PR number extraction logic not found\n');
  process.exit(1);
}

console.log('🎉 All tests passed!\n');
console.log('Summary:');
console.log('- Version endpoint returns correct version from package.json');
console.log('- HTML includes version display element');
console.log('- CSS includes version display styling');
console.log('- JavaScript fetches and displays version on initialization');
console.log('- PR number is extracted from branch name in development mode');

server.close();
process.exit(0);
