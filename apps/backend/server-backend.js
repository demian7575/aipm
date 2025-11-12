// server-backend.js  (commit at repo root)
process.env.TZ = 'Asia/Seoul';
process.env.AI_PM_FORCE_JSON_DB = '1';               // JSON DB preferred
process.env.AI_PM_DISABLE_OPENAI = process.env.AI_PM_DISABLE_OPENAI ?? '0';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const TMP_ROOT = '/tmp/aipm';
const TMP_BACKEND = path.join(TMP_ROOT, 'apps', 'backend');

await mkdir(TMP_BACKEND, { recursive: true });

let startupError = null;
let appServer = null;

async function boot() {
  // Copy backend to /tmp and neutralize sqlite mirror calls (no python on Amplify)
  let appSrc = await readFile('./app.js', 'utf8');
  appSrc = appSrc
    .replace(/await\s+this\._writeSqliteMirror\(\);\s*/g, '// disabled: sqlite mirror (await)\n')
    .replace(/this\._writeSqliteMirror\(\);\s*/g,           '// disabled: sqlite mirror\n');

  await writeFile(path.join(TMP_BACKEND, 'app.js'), appSrc, 'utf8');

  // NOTE: app.js now imports './server.js' inside apps/backend, which we copy as a file (no extra work here)

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

// Guard server: always answers /api/health; proxy to app if available
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

