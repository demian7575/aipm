#!/usr/bin/env node
import { readFile } from 'fs/promises';

console.log('🧪 Testing Assignee Feature\n');

const appJs = await readFile('./apps/frontend/public/app.js', 'utf-8');
const css = await readFile('./apps/frontend/public/styles.css', 'utf-8');

const tests = [
  ['Form field', appJs.includes('id="codewhisperer-assignee"')],
  ['Collect value', appJs.includes('assignee: assigneeInput.value.trim()')],
  ['Card display', appJs.includes('entry.assignee')],
  ['CSS styling', css.includes('.codewhisperer-assignee')],
  ['Input reference', appJs.includes('const assigneeInput = form.elements.assignee')]
];

let passed = 0;
tests.forEach(([name, result]) => {
  console.log(`${result ? '✅' : '❌'} ${name}`);
  if (result) passed++;
});

console.log(`\n${passed}/${tests.length} tests passed\n`);
process.exit(passed === tests.length ? 0 : 1);
