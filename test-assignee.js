#!/usr/bin/env node
import { readFile } from 'fs/promises';

const appJs = await readFile('./apps/frontend/public/app.js', 'utf-8');
const css = await readFile('./apps/frontend/public/styles.css', 'utf-8');

const tests = [
  ['Form field', appJs.includes('id="codewhisperer-assignee"')],
  ['Collect value', appJs.includes('assignee: assigneeInput.value.trim()')],
  ['Card display', appJs.includes('entry.assignee')],
  ['CSS', css.includes('.codewhisperer-assignee')],
  ['Input ref', appJs.includes('const assigneeInput = form.elements.assignee')]
];

let p = 0;
tests.forEach(([n, r]) => {
  console.log(`${r ? '✅' : '❌'} ${n}`);
  if (r) p++;
});

console.log(`\n${p}/${tests.length} passed\n`);
process.exit(p === tests.length ? 0 : 1);
