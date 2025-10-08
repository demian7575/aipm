import { rmSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const publicDir = resolve('apps/frontend/public');
const distDir = resolve('dist/frontend');

const copyRecursive = (source, target) => {
  const stats = statSync(source);
  if (stats.isDirectory()) {
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(source)) {
      copyRecursive(join(source, entry), join(target, entry));
    }
  } else {
    copyFileSync(source, target);
  }
};

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
copyRecursive(publicDir, distDir);
console.log(`Frontend assets copied to ${distDir}`);
