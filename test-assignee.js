#!/usr/bin/env node
import { readFile } from 'fs/promises';

const appJs = await readFile('./apps/frontend/public/app.js', 'utf-8');
const css = await readFile('./apps/frontend/public/styles.css', 'utf-8');

const tests = [
  ['Assignee field on card', appJs.includes('codewhisperer-assignee')],
  ['Editable input', appJs.includes('assignee-input')],
  ['Change handler', appJs.includes("addEventListener('change'")],
  ['CSS styling', css.includes('.codewhisperer-assignee')],
  ['Input CSS', css.includes('.assignee-input')]
];

let p = 0;
tests.forEach(([n, r]) => {
  console.log(`${r ? '✅' : '❌'} ${n}`);
  if (r) p++;
});

console.log(`\n${p}/${tests.length} passed\n`);
process.exit(p === tests.length ? 0 : 1);
