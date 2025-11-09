import { rm, mkdir, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const frontendSrc = path.join(projectRoot, 'apps', 'frontend', 'public');
const backendSrc = path.join(projectRoot, 'apps', 'backend');

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await cp(frontendSrc, path.join(distDir, 'public'), { recursive: true });
  await cp(backendSrc, path.join(distDir, 'backend'), { recursive: true });

  if (Object.prototype.hasOwnProperty.call(process.env, 'AIPM_API_BASE_URL')) {
    const apiBase = process.env.AIPM_API_BASE_URL ?? '';
    const escapedApiBase = apiBase.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const configPath = path.join(distDir, 'public', 'config.js');
    const configContent = `window.__AIPM_API_BASE__ = '${escapedApiBase}';\n`;
    await writeFile(configPath, configContent);
    console.log(`Configured API base URL override written to ${path.relative(projectRoot, configPath)}`);
  }
  console.log(`Build complete. Artifacts available in ${path.relative(projectRoot, distDir)}`);
}

build().catch((error) => {
  console.error('Build failed', error);
  process.exit(1);
});
