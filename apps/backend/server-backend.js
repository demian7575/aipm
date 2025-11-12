// apps/backend/server-backend.js — Amplify Gen2 compute entrypoint (Node 22, ESM)
process.env.TZ = 'Asia/Seoul';
process.env.AI_PM_FORCE_JSON_DB = '1';                          // sqlite 의존 제거
process.env.AI_PM_DISABLE_OPENAI = process.env.AI_PM_DISABLE_OPENAI ?? '0';

import { mkdir, readFile, writeFile, cp as fscp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

// 이 파일(엔트리포인트)의 실제 위치 = apps/backend
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const TMP_ROOT      = '/tmp/aipm';
const TMP_BACKEND   = path.join(TMP_ROOT, 'apps', 'backend');

await mkdir(TMP_BACKEND, { recursive: true });

// 1) apps/backend 전체를 /tmp로 복사 (server.js, 기타 유틸/데이터 포함)
await fscp(__dirname, TMP_BACKEND, { recursive: true });

// 2) /tmp/app.js에서 sqlite 미러 호출만 비활성화
const appPath = path.join(TMP_BACKEND, 'app.js');
let appSrc = await readFile(appPath, 'utf8');
appSrc = appSrc
  .replace(/await\s+this\._writeSqliteMirror\(\);\s*/g, '// disabled: sqlite mirror (await)\n')
  .replace(/this\._writeSqliteMirror\(\);\s*/g,           '// disabled: sqlite mirror\n');
await writeFile(appPath, appSrc, 'utf8');

let startupError = null;
let appServer = null;

async function boot() {
  // 3) /tmp 에서 백엔드 로드
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

// 4) 가드 서버: /api/health는 항상 200, 그 외는 앱으로 위임 (없으면 503)
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

