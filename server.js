// --- server.js 상단: 런타임/DB 경로 설정 ---
import fs from 'node:fs';
import path from 'node:path';

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.AIPM_DB_FILE || '/tmp/aipm.sqlite'; // <- 핵심: /tmp 사용
try { fs.mkdirSync(path.dirname(DB_FILE), { recursive: true }); } catch {}

// TODO: 여러분의 DB 오픈 로직이 DB_FILE을 사용하도록 연결하세요.
// 예: const db = await openDb(DB_FILE);
//     await ensureDatabase(db); // 테이블 생성/시드

// --- 요청 로깅(선택) ---
// app.use((req,res,next)=>{ console.log(`${req.method} ${req.url}`); next(); });

// --- 헬스/FS 진단 라우트 ---
app.get('/api/health', (_req,res) => res.json({ ok:true }));

app.get('/api/diag/fs', (_req,res) => {
  try {
    fs.writeFileSync('/tmp/aipm-write-test.txt', String(Date.now()));
    res.json({ ok:true, writable:'/tmp' });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// --- /api/stories: DB 예외 방어(빈 DB일 땐 200 + []가 정답) ---
app.get('/api/stories', async (_req,res) => {
  try {
    const rows = await db.all('SELECT * FROM stories ORDER BY created_at DESC'); // 여러분 쿼리로 교체
    res.status(200).json(rows ?? []);
  } catch (e) {
    console.error('GET /api/stories failed', e);
    res.status(500).json({ error:'INTERNAL_ERROR', message:String(e?.message || e) });
  }
});

// --- 전역 에러 핸들러(반드시 JSON) ---
app.use((err, req, res, _next) => {
  console.error('UNHANDLED', err);
  res.status(500).json({ error:'INTERNAL_ERROR', message:String(err?.message || err) });
});

// --- 리슨: Compute에서 안전한 바인딩 ---
app.listen(PORT, HOST, () => console.log(`API listening on http://${HOST}:${PORT}`));




















import { createServer } from 'node:http';
import { URL } from 'node:url';

const nativeFetch = globalThis.fetch ? globalThis.fetch.bind(globalThis) : null;

const isHeadersClassAvailable = typeof Headers !== 'undefined';
const isRequestClassAvailable = typeof Request !== 'undefined';
const isReadableStreamAvailable = typeof ReadableStream !== 'undefined';

function headersToRecord(headers) {
  if (!headers) {
    return undefined;
  }

  const record = {};
  const assignEntry = (key, value) => {
    if (key == null) {
      return;
    }
    const normalizedKey = String(key).toLowerCase();
    const normalizedValue = Array.isArray(value) ? value.join(', ') : value;
    if (normalizedValue == null) {
      return;
    }
    record[normalizedKey] = String(normalizedValue);
  };

  if (isHeadersClassAvailable && headers instanceof Headers) {
    headers.forEach((value, key) => assignEntry(key, value));
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => assignEntry(key, value));
  } else if (typeof headers === 'object') {
    Object.entries(headers).forEach(([key, value]) => assignEntry(key, value));
  }

  return Object.keys(record).length > 0 ? record : undefined;
}

function mergeHeaderRecords(...records) {
  return records.reduce((acc, record) => {
    if (!record) {
      return acc;
    }
    return { ...acc, ...record };
  }, undefined);
}

function describeBody(body) {
  if (body == null) {
    return undefined;
  }

  if (typeof body === 'string') {
    return { type: 'string', length: body.length };
  }

  if (body instanceof ArrayBuffer) {
    return { type: 'ArrayBuffer', byteLength: body.byteLength };
  }

  if (ArrayBuffer.isView(body)) {
    return { type: body.constructor?.name || 'ArrayBufferView', byteLength: body.byteLength };
  }

  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    const serialized = body.toString();
    return { type: 'URLSearchParams', length: serialized.length };
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return { type: 'FormData' };
  }

  if (isReadableStreamAvailable && body instanceof ReadableStream) {
    return { type: 'ReadableStream' };
  }

  if (typeof body === 'object' && typeof body.getBoundary === 'function') {
    return { type: 'MultipartBody' };
  }

  return { type: body?.constructor?.name || typeof body };
}

if (nativeFetch) {
  const originalFetch = nativeFetch;

  const loggingFetch = async (input, init) => {
    const requestInit = init ?? {};
    const startedAt = new Date();

    let urlDescription;
    let requestMethod = requestInit.method || 'GET';
    let requestHeaders;
    let requestBodyDescription = describeBody(requestInit.body);

    const isRequestInstance = isRequestClassAvailable && input instanceof Request;

    if (isRequestInstance) {
      urlDescription = input.url;
      if (!requestInit.method && input.method) {
        requestMethod = input.method;
      }
      requestHeaders = mergeHeaderRecords(headersToRecord(input.headers), headersToRecord(requestInit.headers));
      if (!requestBodyDescription) {
        requestBodyDescription = describeBody(input.body);
      }
    } else if (typeof input === 'string' || input instanceof URL) {
      urlDescription = String(input);
      requestHeaders = mergeHeaderRecords(undefined, headersToRecord(requestInit.headers));
    } else if (input && typeof input === 'object' && 'url' in input) {
      urlDescription = String(input.url);
      requestHeaders = mergeHeaderRecords(headersToRecord(input.headers), headersToRecord(requestInit.headers));
      if (!requestBodyDescription && 'body' in input) {
        requestBodyDescription = describeBody(input.body);
      }
    } else {
      urlDescription = String(input);
      requestHeaders = mergeHeaderRecords(undefined, headersToRecord(requestInit.headers));
    }

    const requestSummary = Object.fromEntries(
      Object.entries({
        method: requestMethod,
        url: urlDescription,
        headers: requestHeaders,
        body: requestBodyDescription,
      }).filter(([, value]) => value != null)
    );

    console.log(
      `[${startedAt.toISOString()}] [network] Request -> ${requestMethod} ${urlDescription}`,
      requestSummary
    );

    const startedAtMs = Date.now();

    try {
      const response = await originalFetch(input, init);
      const finishedAt = new Date();
      const duration = Date.now() - startedAtMs;
      console.log(
        `[${finishedAt.toISOString()}] [network] Response <- ${requestMethod} ${urlDescription} ${response.status} ${
          response.statusText || ''
        } (${duration}ms)`
      );
      return response;
    } catch (error) {
      const finishedAt = new Date();
      const duration = Date.now() - startedAtMs;
      console.log(
        `[${finishedAt.toISOString()}] [network] Response <- ${requestMethod} ${urlDescription} FAILED (${duration}ms): ${
          error && error.message ? error.message : error
        }`
      );
      throw error;
    }
  };

  loggingFetch.__aipmOriginalFetch = originalFetch;

  globalThis.fetch = loggingFetch;
}

const CODEX_AUTHOR_PATTERN = /codex/i;

function logWithTimestamp(scope, message, details) {
  const timestamp = new Date().toISOString();
  if (details !== undefined) {
    console.log(`[${timestamp}] [delegation:${scope}] ${message}`, details);
  } else {
    console.log(`[${timestamp}] [delegation:${scope}] ${message}`);
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload ?? {});
  logWithTimestamp('response', `Sending response ${statusCode}`, {
    statusCode,
    body: payload ?? {},
  });
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    logWithTimestamp('request', 'Received empty JSON body');
    return {};
  }
  try {
    const rawBody = Buffer.concat(chunks).toString('utf8');
    logWithTimestamp('request', 'Received JSON body', rawBody);
    return JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 });
  }
}

function ensureGithubToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw Object.assign(new Error('GITHUB_TOKEN environment variable is required'), {
      statusCode: 500,
    });
  }
  return token;
}

function normalizeAcceptanceCriteria(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item || '').trim())
      .filter((item) => item.length > 0);
  }
  if (typeof input === 'string') {
    return input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
  return [];
}

function normalizeDelegatePayload(payload) {
  const owner = String(payload.owner || '').trim();
  const repo = String(payload.repo || '').trim();
  const repositoryApiUrl = String(payload.repositoryApiUrl || '').trim();
  const branchName = String(payload.branchName || '').trim();
  const taskTitle = String(payload.taskTitle || '').trim();
  const objective = String(payload.objective || '').trim();
  const prTitle = String(payload.prTitle || '').trim();
  const constraints = String(payload.constraints || '').trim();
  const target = String(payload.target || 'new-issue');
  const acceptanceCriteria = normalizeAcceptanceCriteria(payload.acceptanceCriteria);
  const storyTitle = String(payload.storyTitle || '').trim();
  const storyId = payload.storyId ?? null;

  if (!repositoryApiUrl) {
    throw Object.assign(new Error('Repository API URL is required'), { statusCode: 400 });
  }
  if (!owner) {
    throw Object.assign(new Error('Owner is required'), { statusCode: 400 });
  }
  if (!repo) {
    throw Object.assign(new Error('Repository name is required'), { statusCode: 400 });
  }
  if (!branchName) {
    throw Object.assign(new Error('Branch name is required'), { statusCode: 400 });
  }
  if (!taskTitle) {
    throw Object.assign(new Error('Task title is required'), { statusCode: 400 });
  }
  if (!objective) {
    throw Object.assign(new Error('Objective is required'), { statusCode: 400 });
  }
  if (!prTitle) {
    throw Object.assign(new Error('PR title is required'), { statusCode: 400 });
  }
  if (!constraints) {
    throw Object.assign(new Error('Constraints are required'), { statusCode: 400 });
  }
  if (acceptanceCriteria.length === 0) {
    throw Object.assign(new Error('Acceptance criteria are required'), { statusCode: 400 });
  }

  let targetNumber = payload.targetNumber;
  if (target !== 'new-issue') {
    if (targetNumber == null || targetNumber === '') {
      throw Object.assign(new Error('Issue or PR number is required'), { statusCode: 400 });
    }
    const parsed = Number(targetNumber);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw Object.assign(new Error('Issue or PR number must be numeric'), { statusCode: 400 });
    }
    targetNumber = parsed;
  } else {
    targetNumber = undefined;
  }

  return {
    repositoryApiUrl,
    owner,
    repo,
    branchName,
    taskTitle,
    objective,
    prTitle,
    constraints,
    acceptanceCriteria,
    target,
    targetNumber,
    storyTitle,
    storyId,
  };
}

export function buildTaskBrief(payload) {
  const criteria = normalizeAcceptanceCriteria(payload.acceptanceCriteria);
  const lines = [
    '@codex',
    '',
    '# AIPM Task Brief',
    `Story-ID: ${payload.storyId ?? ''}`.trim(),
    `Story-Title: ${payload.storyTitle ?? ''}`.trim(),
    '',
    '## Objective',
    payload.objective || 'Deliver the referenced story with Codex support.',
    '',
    '## Deliverables',
    `- Implement feature per story in branch: ${payload.branchName}`,
    '- Tests: unit + minimal e2e (where applicable)',
    `- PR back to main with title: "${payload.prTitle}"`,
    '',
    '## Constraints',
    payload.constraints,
    '',
    '## Acceptance Criteria',
  ];

  if (criteria.length) {
    criteria.forEach((line) => {
      lines.push(`- ${line}`);
    });
  } else {
    lines.push('- Define measurable acceptance criteria with Codex.');
  }

  lines.push(
    '',
    '## Repo',
    `Owner/Repo: ${payload.owner}/${payload.repo}`,
    `Default API URL: https://api.github.com/repos/${payload.owner}/${payload.repo}`
  );

  return lines.join('\n');
}

async function githubRequest(path, options = {}) {
  const token = ensureGithubToken();
  const url = new URL(path, 'https://api.github.com');
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'aipm-delegation-server',
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const message =
      (data && data.message) || `GitHub request failed with status ${response.status}`;
    console.error('GitHub request failed', {
      path: url.pathname,
      status: response.status,
      message,
      details: data,
    });
    throw Object.assign(new Error(message), { statusCode: response.status || 502, details: data });
  }
  return data;
}

export async function performDelegation(payload) {
  const normalized = normalizeDelegatePayload(payload);
  const body = buildTaskBrief({ ...normalized, owner: normalized.owner, repo: normalized.repo });
  const repoPath = `/repos/${normalized.owner}/${normalized.repo}`;
  const confirmationCode = generateConfirmationCode();

  if (normalized.target === 'new-issue') {
    const issue = await githubRequest(`${repoPath}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title: normalized.taskTitle,
        body,
      }),
    });
    const comment = await githubRequest(`${repoPath}/issues/${issue.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    return {
      type: 'issue',
      id: issue.id,
      html_url: comment?.html_url || issue.html_url,
      number: issue.number,
      commentId: comment?.id ?? null,
      taskHtmlUrl: issue.html_url,
      threadHtmlUrl: comment?.html_url || issue.html_url,
      confirmationCode,
    };
  }

  const number = normalized.targetNumber;
  const comment = await githubRequest(`${repoPath}/issues/${number}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  return {
    type: 'comment',
    id: comment.id,
    html_url: comment.html_url,
    number,
    taskHtmlUrl: comment.html_url ? comment.html_url.split('#')[0] : null,
    threadHtmlUrl: comment.html_url,
    confirmationCode,
  };
}

export async function handlePersonalDelegateRequest(req, res, url = new URL(req.url, 'http://localhost')) {
  try {
    if (req.method !== 'POST') {
      sendJson(res, 405, { message: 'Method not allowed' });
      return;
    }
    logWithTimestamp('request', 'Handling /personal-delegate request', {
      method: req.method,
      url: url.toString(),
      headers: headersToRecord(req.headers),
    });
    const payload = await readJson(req);
    logWithTimestamp('request', 'Parsed delegation payload', payload);
    const result = await performDelegation(payload);
    logWithTimestamp('response', 'Delegation result generated', result);
    sendJson(res, 201, result);
  } catch (error) {
    console.error('Personal delegation request failed', error);
    const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
    const message = error.message || 'Failed to delegate task';
    sendJson(res, status, { message });
  }
}

function extractLinks(text) {
  if (typeof text !== 'string') {
    return [];
  }
  const matches = text.match(/https?:\/\/\S+/g);
  if (!matches) {
    return [];
  }
  const seen = new Set();
  return matches
    .map((entry) => entry.replace(/[)\]\.,]+$/, ''))
    .filter((entry) => {
      const value = entry.trim();
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
}

function summarizeComment(body) {
  if (typeof body !== 'string') {
    return '';
  }
  const text = body.replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }
  const max = 220;
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

function generateConfirmationCode(length = 8) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length);
    code += alphabet.charAt(index);
  }
  return code;
}

export async function handlePersonalDelegateStatusRequest(
  req,
  res,
  url = new URL(req.url, 'http://localhost')
) {
  try {
    if (req.method !== 'GET') {
      sendJson(res, 405, { message: 'Method not allowed' });
      return;
    }
    logWithTimestamp('request', 'Handling /personal-delegate/status request', {
      method: req.method,
      url: url.toString(),
      headers: headersToRecord(req.headers),
      query: Object.fromEntries(url.searchParams.entries()),
    });
    const owner = url.searchParams.get('owner')?.trim();
    const repo = url.searchParams.get('repo')?.trim();
    const numberParam = url.searchParams.get('number');
    if (!owner || !repo) {
      throw Object.assign(new Error('owner and repo query parameters are required'), {
        statusCode: 400,
      });
    }
    const number = Number(numberParam);
    if (!Number.isFinite(number) || number <= 0) {
      throw Object.assign(new Error('number query parameter must be numeric'), {
        statusCode: 400,
      });
    }

    const comments = await githubRequest(
      `/repos/${owner}/${repo}/issues/${number}/comments?per_page=30&direction=desc`
    );
    let latestComment = null;
    if (Array.isArray(comments)) {
      latestComment = comments.find((comment) => {
        const login = comment?.user?.login || '';
        return CODEX_AUTHOR_PATTERN.test(login);
      });
    }

    const response = {
      fetchedAt: new Date().toISOString(),
      totalComments: Array.isArray(comments) ? comments.length : 0,
      latestComment: latestComment
        ? {
            id: latestComment.id,
            body: latestComment.body || '',
            html_url: latestComment.html_url || '',
            created_at: latestComment.created_at || null,
            author: latestComment.user?.login || 'codex',
            links: extractLinks(latestComment.body || ''),
            snippet: summarizeComment(latestComment.body || ''),
          }
        : null,
    };
    logWithTimestamp('response', 'Delegation status response ready', response);
    sendJson(res, 200, response);
  } catch (error) {
    console.error('Personal delegation status request failed', error);
    const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
    const message = error.message || 'Failed to fetch Codex status';
    sendJson(res, status, { message });
  }
}

export function createDelegationServer(options = {}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const method = req.method ?? 'GET';
    logWithTimestamp('request', 'Incoming delegation server request', {
      method,
      url: url.toString(),
      headers: headersToRecord(req.headers),
    });

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      });
      logWithTimestamp('response', 'Responding to OPTIONS preflight');
      res.end();
      return;
    }

    if (url.pathname === '/personal-delegate' && method === 'POST') {
      void handlePersonalDelegateRequest(req, res, url);
      return;
    }

    if (url.pathname === '/personal-delegate/status' && method === 'GET') {
      void handlePersonalDelegateStatusRequest(req, res, url);
      return;
    }

    sendJson(res, 404, { message: 'Not found' });
  });
  return server;
}

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  const port = Number(process.env.DELEGATE_PORT || 4100);
  const server = createDelegationServer();
  server.listen(port, () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    console.log(`Delegation server listening on http://localhost:${actualPort}`);
  });
}
