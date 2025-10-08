import { rmSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const srcDir = resolve('apps/backend/src');
const distDir = resolve('dist/backend');

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
copyRecursive(srcDir, distDir);
console.log(`Backend files copied to ${distDir}`);
