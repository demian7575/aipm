// server-backend.js
// Amplify Hosting (Gen2) compute entrypoint for AIPM
// - Starts an HTTP server on port 3000 (required by Gen2)
// - Runs backend from /tmp (writable FS)
// - Disables SQLite mirror calls (Amplify runtime has no python3)
// - Always exposes /api/health (even if app boot fails)
// - Checks presence of process.env.GITHUB_TOKEN (for delegation flows)






// server-backend.js (top)
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

async function injectGithubTokenFromSSM() {
  if (process.env.GITHUB_TOKEN) return; // already provided by env
  const name = process.env.AMPLIFY_GITHUB_TOKEN_PARAM;
  if (!name) return;

  try {
    const ssm = new SSMClient({});
    const out = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
    const val = out.Parameter?.Value;
    if (val) {
      process.env.GITHUB_TOKEN = val; // now your code sees it
      console.log('[SSM] Loaded GITHUB_TOKEN from', name);
    } else {
      console.warn('[SSM] Parameter has no value:', name);
    }
  } catch (e) {
    console.error('[SSM] Failed to read secret:', e);
  }
}

await injectGithubTokenFromSSM();











process.env.TZ = process.env.TZ || 'Asia/Seoul';

// Prefer JSON storage; avoid sqlite/python in Amplify
process.env.AI_PM_FORCE_JSON_DB = process.env.AI_PM_FORCE_JSON_DB || '1';

// Allow external AI calls (Codex etc.). Set to '1' to block.
process.env.AI_PM_DISABLE_OPENAI = process.env.AI_PM_DISABLE_OPENAI || '0';

// Optional writable locations (your app may or may not use these envs)
process.env.AIPM_DATA_DIR = process.env.AIPM_DATA_DIR || '/tmp/aipm/data';
process.env.AIPM_UPLOAD_DIR = process.env.AIPM_UPLOAD_DIR || '/tmp/aipm/uploads';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const TMP_ROOT = '/tmp/aipm';
const TMP_BACKEND = path.join(TMP_ROOT, 'apps', 'backend');

await mkdir(TMP_BACKEND, { recursive: true });
await mkdir(process.env.AIPM_DATA_DIR, { recursive: true }).catch(() => {});
await mkdir(process.env.AIPM_UPLOAD_DIR, { recursive: true }).catch(() => {});

let startupError = null;
let appServer = null;

async function boot() {
  // 1) Load original sources from the bundle (read-only FS)
  let appSrc = await readFile('./apps/backend/app.js', 'utf8');

  // 2) Disable ONLY the calls to _writeSqliteMirror (safer than rewriting function body)
  //    Amplify compute does not have python3; these calls would crash at runtime.
  appSrc = appSrc
    .replace(/await\s+this\._writeSqliteMirror\(\);\s*/g, '// disabled: sqlite mirror (await)\n')
    .replace(/this\._writeSqliteMirror\(\);\s*/g,           '// disabled: sqlite mirror\n');

  // 3) Copy backend app.js and root server.js to /tmp so relative imports keep working
  //    (AIPM backend imports ../../server.js relative to apps/backend/app.js)
  const rootServerSrc = await readFile('./server.js', 'utf8');

  await writeFile(path.join(TMP_BACKEND, 'app.js'), appSrc, 'utf8');
  await writeFile(path.join(TMP_ROOT, 'server.js'), rootServerSrc, 'utf8');
  console.log('[BOOT] copied root server.js to /tmp/aipm/server.js');

  // 4) Load backend from /tmp and create the HTTP handler (node:22 ESM import)
  const { createApp } = await import('file:///tmp/aipm/apps/backend/app.js');
  appServer = await createApp();

  console.log('[BOOT] appServer created (port 3000)');
}

try {
  await boot();
} catch (e) {
  startupError = e;
  console.error('[BOOT] createApp failed:', e);
}

// Guard server: always answers /api/health and proxies the rest to the app if up
const PORT = 3000;
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');

    // Minimal request log (comment out if too verbose)
    // console.log('[REQ]', new Date().toISOString(), req.method, url.pathname);

    // Health check is ALWAYS 200
    if (url.pathname === '/api/health') {
      const body = JSON.stringify({
        ok: !startupError,
        now: new Date().toISOString(),
        hasGithubToken: Boolean(process.env.GITHUB_TOKEN),
        hasRuntimeTest: Boolean(process.env.RUNTIME_TEST),
        error: startupError ? (startupError.message || String(startupError)) : null
      });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(body);
      return;
    }

    // If app started, proxy to it
    if (appServer) {
      // Ensure API responses are not cached by edge/CDN
      res.setHeader?.('Cache-Control', 'no-store');
      appServer.emit('request', req, res);
      return;
    }

    // App failed to start: return 503 for non-health requests
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Service Unavailable');
  } catch (err) {
    // Last-resort 500
    try {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    } catch {}
    res.end('Internal Server Error');
    console.error('[REQ ERROR]', err);
  }
});

server.listen(PORT, () => {
  console.log('[BOOT] listening on', PORT);
  console.log('[ENV] GITHUB_TOKEN present?', Boolean(process.env.GITHUB_TOKEN));
  console.log('[ENV] GITHUB_TOKEN_RUNTIME present?', Boolean(process.env.GITHUB_TOKEN_RUNTIME));
});

