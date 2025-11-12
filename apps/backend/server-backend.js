// apps/backend/server-backend.js — Amplify Gen2 compute entrypoint (Node 22, ESM)
process.env.TZ = 'Asia/Seoul';
process.env.AI_PM_FORCE_JSON_DB = '1';                          // no sqlite at Amplify
process.env.AI_PM_DISABLE_OPENAI = process.env.AI_PM_DISABLE_OPENAI ?? '0';

import { mkdir, readFile, writeFile, cp as fscp, access, constants, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const TMP_ROOT    = '/tmp/aipm';
const TMP_BACKEND = path.join(TMP_ROOT, 'apps', 'backend');

await mkdir(TMP_BACKEND, { recursive: true });

// 1) Copy entire backend into /tmp (so all relative imports resolve)
await fscp(__dirname, TMP_BACKEND, { recursive: true });

// 2) Patch /tmp app.js:
//    - disable sqlite mirror calls
//    - change '../../server.js' -> './server.js'
const appPath = path.join(TMP_BACKEND, 'app.js');
let appSrc = await readFile(appPath, 'utf8');

const hadRootImport = appSrc.includes("../../server.js");
appSrc = appSrc
  .replace(/await\s+this\._writeSqliteMirror\(\);\s*/g, '// disabled: sqlite mirror (await)\n')
  .replace(/this\._writeSqliteMirror\(\);\s*/g,           '// disabled: sqlite mirror\n')
  .replace(/from\s+['"]\.\.\/\.\.\/server\.js['"]/g, "from './server.js'");

await writeFile(appPath, appSrc, 'utf8');

// 3) Safety: if code elsewhere still resolves root import, provide it
try {
  await access(path.join(TMP_BACKEND, 'server.js'), constants.R_OK);
  await copyFile(path.join(TMP_BACKEND, 'server.js'), path.join(TMP_ROOT, 'server.js'));
} catch { /* ignore if missing */ }

let startupError = null;
let appServer = null;

async function boot() {
  const { createApp } = await import('file:///tmp/aipm/apps/backend/app.js');
  appServer = await createApp();
}

try {
  await boot();
  console.log('[BOOT] appServer created (port 3000)');
} catch (e) {
  startupError = e;
  console.error('[BOOT] createApp failed:', e);
}

// Guard server: /api/health always returns status; others proxy or 503
const PORT = 3000;
const guard = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (url.pathname === '/api/health') {
    const body = JSON.stringify({
      ok: !startupError,
      now: new Date().toISOString(),
      hasGithubToken: Boolean(process.env.GITHUB_TOKEN),
      error: startupError ? (startupError.message || String(startupError)) : null
    });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(body);
    return;
  }

  if (appServer) {
    appServer.emit('request', req, res);
  } else {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Service Unavailable');
  }
});

guard.listen(PORT, () => {
  console.log('[BOOT] listening on', PORT);
  console.log('[ENV] GITHUB_TOKEN present?', Boolean(process.env.GITHUB_TOKEN));
});

