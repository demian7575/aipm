#!/usr/bin/env node
import { readFile } from 'fs/promises';

const appJs = await readFile('./apps/frontend/public/app.js', 'utf-8');
const css = await readFile('./apps/frontend/public/styles.css', 'utf-8');

const tests = [
  ['Assignee field on card', appJs.includes('codewhisperer-assignee')],
  ['Assignee row element', appJs.includes('codewhisperer-assignee-row')],
  ['Update button', appJs.includes('updateAssigneeBtn')],
  ['Assignee input', appJs.includes("assigneeInput.type = 'text'")],
  ['Assignee label', appJs.includes("assigneeLabel.textContent = 'Assignee:'")]
];

let p = 0;
tests.forEach(([n, r]) => {
  console.log(`${r ? '✅' : '❌'} ${n}`);
  if (r) p++;
});

console.log(`\n${p}/${tests.length} passed\n`);
process.exit(p === tests.length ? 0 : 1);
