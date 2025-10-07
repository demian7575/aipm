#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const target = path.resolve('apps/frontend/dist');
if (!fs.existsSync(target)) {
  console.warn('Bundle not found, skipping size check.');
  process.exit(0);
}

function folderSize(folder) {
  const entries = fs.readdirSync(folder, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const entryPath = path.resolve(folder, entry.name);
    const stats = fs.statSync(entryPath);
    if (entry.isDirectory()) {
      total += folderSize(entryPath);
    } else {
      total += stats.size;
    }
  }
  return total;
}

const size = folderSize(target);
const maxBytes = 5 * 1024 * 1024;
if (size > maxBytes) {
  console.error(`Bundle size ${(size / 1024).toFixed(1)}KB exceeds limit ${(maxBytes / 1024).toFixed(1)}KB.`);
  process.exit(1);
}
console.log(`Bundle size ${(size / 1024).toFixed(1)}KB is within limit.`);
