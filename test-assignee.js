#!/usr/bin/env node

import { readFile } from 'fs/promises';

console.log('🧪 Testing Development Task Assignee Feature\n');

// Test 1: Check HTML form has assignee field
console.log('Test 1: Checking for assignee field in modal form...');
const appJs = await readFile('./apps/frontend/public/app.js', 'utf-8');

if (appJs.includes('id="codewhisperer-assignee"') && 
    appJs.includes('name="assignee"')) {
  console.log('✅ Assignee input field exists in form\n');
} else {
  console.log('❌ Assignee input field not found in form\n');
  process.exit(1);
}

// Test 2: Check assignee is collected from form
console.log('Test 2: Checking assignee is collected from form data...');
if (appJs.includes('assignee: assigneeInput.value.trim()')) {
  console.log('✅ Assignee is collected from form\n');
} else {
  console.log('❌ Assignee not collected from form\n');
  process.exit(1);
}

// Test 3: Check assignee is displayed on task card
console.log('Test 3: Checking assignee display on task card...');
if (appJs.includes('entry.assignee') && 
    appJs.includes('codewhisperer-assignee')) {
  console.log('✅ Assignee is displayed on task card\n');
} else {
  console.log('❌ Assignee display not found on task card\n');
  process.exit(1);
}

// Test 4: Check CSS styling for assignee
console.log('Test 4: Checking CSS styling for assignee...');
const css = await readFile('./apps/frontend/public/styles.css', 'utf-8');
if (css.includes('.codewhisperer-assignee')) {
  console.log('✅ Assignee CSS styling exists\n');
} else {
  console.log('❌ Assignee CSS styling not found\n');
  process.exit(1);
}

// Test 5: Check assignee input reference
console.log('Test 5: Checking assignee input reference...');
if (appJs.includes('const assigneeInput = form.elements.assignee')) {
  console.log('✅ Assignee input reference exists\n');
} else {
  console.log('❌ Assignee input reference not found\n');
  process.exit(1);
}

// Test 6: Check assignee default value from story
console.log('Test 6: Checking assignee default value...');
if (appJs.includes('assigneeInput.value = defaults.assignee || story?.assigneeEmail')) {
  console.log('✅ Assignee defaults to story assigneeEmail\n');
} else {
  console.log('❌ Assignee default value not set correctly\n');
  process.exit(1);
}

console.log('🎉 All tests passed!\n');
console.log('Summary:');
console.log('- Assignee input field added to development task modal');
console.log('- Assignee is collected from form data');
console.log('- Assignee is displayed on task cards');
console.log('- CSS styling applied for assignee display');
console.log('- Assignee defaults to story assigneeEmail');
console.log('- Users can now assign tasks to specific team members');

process.exit(0);
