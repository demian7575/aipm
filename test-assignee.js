#!/usr/bin/env node

import { readFile } from 'fs/promises';

console.log('🧪 Testing Development Task Assignee Feature\n');

const appJs = await readFile('./apps/frontend/public/app.js', 'utf-8');
const css = await readFile('./apps/frontend/public/styles.css', 'utf-8');

let passed = 0;
let failed = 0;

// Test 1: Assignee field in form
console.log('Test 1: Assignee field in modal form...');
if (appJs.includes('id="codewhisperer-assignee"') && appJs.includes('name="assignee"')) {
  console.log('✅ PASS\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 2: Assignee collected from form
console.log('Test 2: Assignee collected from form...');
if (appJs.includes('assignee: assigneeInput.value.trim()')) {
  console.log('✅ PASS\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 3: Assignee displayed on card
console.log('Test 3: Assignee displayed on task card...');
if (appJs.includes('entry.assignee') && appJs.includes('codewhisperer-assignee')) {
  console.log('✅ PASS\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 4: CSS styling
console.log('Test 4: CSS styling for assignee...');
if (css.includes('.codewhisperer-assignee')) {
  console.log('✅ PASS\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 5: Input reference
console.log('Test 5: Assignee input reference...');
if (appJs.includes('const assigneeInput = form.elements.assignee')) {
  console.log('✅ PASS\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
} else {
  process.exit(1);
}
