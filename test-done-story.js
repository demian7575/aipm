#!/usr/bin/env node
import { readFile } from 'fs/promises';

const appJs = await readFile('./apps/frontend/public/app.js', 'utf-8');
const css = await readFile('./apps/frontend/public/styles.css', 'utf-8');

const tests = [
  ['Done status check', appJs.includes("child.status === 'Done'")],
  ['Add done-story class', appJs.includes("classList.add('done-story')")],
  ['CSS dark grey color', css.includes('.child-story-title.done-story')],
  ['Color value #4b5563', css.includes('#4b5563')]
];

let p = 0;
tests.forEach(([n, r]) => {
  console.log(`${r ? '✅' : '❌'} ${n}`);
  if (r) p++;
});

console.log(`\n${p}/${tests.length} passed\n`);
process.exit(p === tests.length ? 0 : 1);
