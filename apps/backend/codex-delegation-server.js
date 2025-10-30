import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const BOOLEAN_TRUE = new Set(['1', 'true', 'yes', 'on']);
const BOOLEAN_FALSE = new Set(['0', 'false', 'no', 'off']);

const DEFAULT_PROTOCOL = normalizeProtocol(
  process.env.AI_PM_CODEX_EMBEDDED_PROTOCOL || 'http'
);
const DEFAULT_HOST = process.env.AI_PM_CODEX_EMBEDDED_HOST || '127.0.0.1';
const DEFAULT_PORT = normalizePort(process.env.AI_PM_CODEX_EMBEDDED_PORT) ?? 5005;
const DEFAULT_PATH = normalizePath(process.env.AI_PM_CODEX_EMBEDDED_PATH || '/delegate');

let startupPromise = null;
let taskCounter = 4200;

export function getEmbeddedCodexDelegationUrl() {
  const host = formatHost(DEFAULT_HOST);
  return `${DEFAULT_PROTOCOL}://${host}:${DEFAULT_PORT}${DEFAULT_PATH}`;
}

export function ensureEmbeddedCodexDelegationServer(options = {}) {
  if (startupPromise) {
    return startupPromise;
  }
  startupPromise = startEmbeddedServer(options);
  return startupPromise;
}

async function startEmbeddedServer(options = {}) {
  const disabled = parseBoolean(
    options.disabled ?? process.env.AI_PM_DISABLE_EMBEDDED_CODEX
  );
  if (disabled) {
    return { disabled: true, server: null, url: null };
  }

  const protocol = normalizeProtocol(options.protocol || DEFAULT_PROTOCOL);
  const host = options.host || DEFAULT_HOST;
  const port = normalizePort(options.port) ?? DEFAULT_PORT;
  const path = normalizePath(options.path || DEFAULT_PATH);
  const formattedHost = formatHost(host);
  const url = `${protocol}://${formattedHost}:${port}${path}`;

  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      const { pathname } = requestUrl;
      const method = req.method || 'GET';

      if (method === 'OPTIONS' && pathname === path) {
        res.writeHead(204, buildCorsHeaders());
        res.end();
        return;
      }

      if (method === 'GET' && pathname === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'codex-delegation' }));
        return;
      }

      if (method === 'POST' && pathname === path) {
        await handleDelegationRequest(req, res, { protocol, host, port, path });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Not found' }));
    } catch (error) {
      console.error('Embedded Codex delegation server request failed', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Internal server error' }));
    }
  });

  return await new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off('error', handleError);
      if (error && error.code === 'EADDRINUSE') {
        console.warn(
          `Embedded Codex delegation server port ${port} already in use – assuming an external service is running.`
        );
        resolve({
          disabled: true,
          server: null,
          url,
          reason: 'port-in-use',
        });
        return;
      }
      reject(error);
    };

    server.once('error', handleError);
    server.listen(port, host, () => {
      server.off('error', handleError);
      if (typeof server.unref === 'function') {
        server.unref();
      }
      console.log(`Embedded Codex delegation server listening on ${url}`);
      resolve({ disabled: false, server, url });
    });
  });
}

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

async function handleDelegationRequest(req, res, context) {
  const headers = buildCorsHeaders();
  headers['Content-Type'] = 'application/json';

  try {
    const text = await readRequestBody(req);
    if (!text) {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ message: 'Delegation payload is required.' }));
      return;
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ message: 'Delegation payload must be valid JSON.' }));
      return;
    }

    const repositoryUrl = normalizeRepositoryUrl(payload.repositoryUrl);
    if (!repositoryUrl) {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ message: 'Repository URL is required.' }));
      return;
    }

    const taskTitleInput =
      typeof payload.taskTitle === 'string' ? payload.taskTitle : payload.prTitle;
    const taskTitle = typeof taskTitleInput === 'string' ? taskTitleInput.trim() : '';
    if (!taskTitle) {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ message: 'Task title is required.' }));
      return;
    }

    const taskBody = typeof payload.taskBody === 'string' ? payload.taskBody : payload.prBody;
    const story = sanitizeStory(payload.story);
    const preferredBranch =
      typeof payload.branchName === 'string' ? payload.branchName.trim() : '';
    const branchName = buildBranchName({ story, prTitle: taskTitle, preferredBranch });

    const taskId = allocateCodexTaskNumber();
    const taskUrl = deriveCodexTaskUrl(repositoryUrl, taskId);
    const requestId = randomUUID();
    const receivedAt = new Date().toISOString();

    const responseBody = {
      taskId,
      taskUrl,
      status: 'queued',
      branchName,
      message: 'Codex task created.',
      metadata: {
        requestId,
        receivedAt,
        repositoryUrl,
        branchName,
        taskTitle,
        taskUrl,
        projectUrl:
          typeof payload.projectUrl === 'string' ? payload.projectUrl.trim() : '',
        story,
        server: {
          endpoint: `${context.protocol}://${formatHost(context.host)}:${context.port}${context.path}`,
        },
        task: {
          id: taskId,
          url: taskUrl,
          title: taskTitle,
          status: 'queued',
          body: taskBody || '',
        },
      },
    };

    res.writeHead(200, headers);
    res.end(JSON.stringify(responseBody));
  } catch (error) {
    console.error('Embedded Codex delegation request failed', error);
    res.writeHead(500, headers);
    res.end(JSON.stringify({ message: 'Embedded delegation failed to process the request.' }));
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.setEncoding('utf8');
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(chunks.join('')));
    req.on('error', (error) => reject(error));
  });
}

function sanitizeStory(story) {
  if (!story || typeof story !== 'object') {
    return null;
  }
  const sanitized = {
    id: sanitizeNumber(story.id),
    title: typeof story.title === 'string' ? story.title : '',
    status: typeof story.status === 'string' ? story.status : '',
    assigneeEmail:
      typeof story.assigneeEmail === 'string'
        ? story.assigneeEmail
        : typeof story.assignee_email === 'string'
        ? story.assignee_email
        : '',
  };
  if (story.storyPoint != null || story.story_point != null) {
    sanitized.storyPoint = sanitizeNumber(story.storyPoint ?? story.story_point);
  }
  if (Array.isArray(story.components)) {
    sanitized.components = story.components
      .map((item) => (typeof item === 'string' ? item : null))
      .filter((item) => item);
  }
  return sanitized;
}

function sanitizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildBranchName({ story, prTitle, preferredBranch }) {
  if (preferredBranch) {
    return preferredBranch;
  }

  const baseTitle = story?.title || prTitle || 'codex-update';
  const slug = slugify(baseTitle) || 'codex-update';
  const suffix = story?.id ? `story-${story.id}` : randomUUID().slice(0, 8);
  return `codex/${slug}-${suffix}`;
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48);
}

function allocateCodexTaskNumber() {
  taskCounter += 1;
  return taskCounter;
}

function deriveCodexTaskUrl(repositoryUrl, taskId) {
  try {
    const parsed = new URL(repositoryUrl);
    const path = parsed.pathname.replace(/\.git$/, '').replace(/\/+$/, '');
    const base = `${parsed.protocol}//${parsed.host}${path}`;
    return `${base}/codex-tasks/${taskId}`;
  } catch (error) {
    // ignore and fall back to string manipulation
  }
  const clean = repositoryUrl.replace(/\.git$/, '').replace(/\/+$/, '');
  return `${clean}/codex-tasks/${taskId}`;
}

function normalizeRepositoryUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch (error) {
    return '';
  }
}

function normalizePath(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return '/delegate';
  }
  return value.startsWith('/') ? value : `/${value}`;
}

function normalizeProtocol(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'http';
  }
  return value.replace(/:$/, '').toLowerCase();
}

function normalizePort(value) {
  if (value == null || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Math.floor(numeric);
}

function parseBoolean(value) {
  if (value == null) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const text = String(value).trim().toLowerCase();
  if (BOOLEAN_TRUE.has(text)) {
    return true;
  }
  if (BOOLEAN_FALSE.has(text)) {
    return false;
  }
  return false;
}

function formatHost(host) {
  if (host.includes(':') && !host.startsWith('[') && !host.endsWith(']')) {
    return `[${host}]`;
  }
  return host;
}
