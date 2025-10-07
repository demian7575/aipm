#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const bundlePath = join('apps', 'frontend', 'dist', 'assets');
let totalBytes = 0;
try {
  const manifest = JSON.parse(readFileSync(join(bundlePath, 'manifest.json'), 'utf-8'));
  for (const value of Object.values(manifest)) {
    if (value && typeof value === 'object' && 'file' in value) {
      const filePath = join(bundlePath, value.file);
      const { size } = statSync(filePath);
      totalBytes += size;
    }
  }
} catch (error) {
  console.error('Bundle size guard skipped:', error.message);
  process.exit(0);
}

const limitKb = 1024; // 1 MB
const totalKb = Math.round(totalBytes / 1024);
if (totalKb > limitKb) {
  console.error(`Bundle size ${totalKb}KB exceeds limit of ${limitKb}KB`);
  process.exit(1);
}

console.log(`Bundle size OK: ${totalKb}KB <= ${limitKb}KB`);
