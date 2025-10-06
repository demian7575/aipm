const { statSync, readdirSync } = require('fs');
const { join } = require('path');

const targetDir = join(__dirname, '..', 'apps', 'frontend', 'dist');
const limitKb = Number(process.env.BUNDLE_LIMIT_KB ?? 6000);

const walk = (dir) => {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += walk(fullPath);
    } else {
      total += statSync(fullPath).size;
    }
  }
  return total;
};

try {
  const sizeBytes = walk(targetDir);
  const sizeKb = Math.round(sizeBytes / 1024);
  console.log(`Frontend bundle size: ${sizeKb} KB`);
  if (sizeKb > limitKb) {
    console.error(`Bundle size ${sizeKb} KB exceeds limit ${limitKb} KB`);
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to evaluate bundle size', error);
  process.exit(1);
}
