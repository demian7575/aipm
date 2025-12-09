#!/usr/bin/env node
import { readFile } from 'fs/promises';

const appJs = await readFile('./apps/frontend/public/app.js', 'utf-8');

const tests = [
  ['Auto-open after child story', appJs.includes('openAcceptanceTestModal(created.id')],
  ['autoGenerate option', appJs.includes('autoGenerate = false')],
  ['Auto-generation trigger', appJs.includes('if (autoGenerate && !test)')],
  ['loadDraft call', appJs.includes('loadDraft()')],
  ['setTimeout delay', appJs.includes('setTimeout(() => {')]
];

let p = 0;
tests.forEach(([n, r]) => {
  console.log(`${r ? '✅' : '❌'} ${n}`);
  if (r) p++;
});

console.log(`\n${p}/${tests.length} passed\n`);
process.exit(p === tests.length ? 0 : 1);
