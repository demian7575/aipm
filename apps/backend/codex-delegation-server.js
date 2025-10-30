import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const { Buffer } = globalThis;

const BOOLEAN_TRUE = new Set(['1', 'true', 'yes', 'on']);
const BOOLEAN_FALSE = new Set(['0', 'false', 'no', 'off']);

const DEFAULT_PROTOCOL = normalizeProtocol(
  process.env.AI_PM_CODEX_EMBEDDED_PROTOCOL || 'http'
);
const DEFAULT_HOST = process.env.AI_PM_CODEX_EMBEDDED_HOST || '127.0.0.1';
const DEFAULT_PORT = normalizePort(process.env.AI_PM_CODEX_EMBEDDED_PORT) ?? 5005;
const DEFAULT_PATH = normalizePath(process.env.AI_PM_CODEX_EMBEDDED_PATH || '/delegate');
const DEFAULT_GITHUB_API_BASE = normalizeGitHubApiBase(
  process.env.AI_PM_CODEX_GITHUB_API_URL || 'https://api.github.com'
);

let startupPromise = null;
let prCounter = 4200;

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

    const prTitle = typeof payload.prTitle === 'string' ? payload.prTitle.trim() : '';
    if (!prTitle) {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ message: 'Pull-request title is required.' }));
      return;
    }

    const prBody =
      typeof payload.prBody === 'string' ? payload.prBody : '';
    const story = sanitizeStory(payload.story);
    const preferredBranch =
      typeof payload.branchName === 'string' ? payload.branchName.trim() : '';
    const branchName = buildBranchName({ story, prTitle, preferredBranch });

    const pullRequestNumber = allocatePullRequestNumber();
    const pullRequestUrl = derivePullRequestUrl(repositoryUrl, pullRequestNumber);
    const requestId = randomUUID();
    const receivedAt = new Date().toISOString();

    const authorizationHeader = extractAuthorizationHeader(req.headers);
    const headerToken = extractBearerToken(authorizationHeader);
    const bodyToken =
      typeof payload.token === 'string' ? payload.token.trim() : '';
    const envToken =
      typeof process.env.AI_PM_CODEX_EMBEDDED_GITHUB_TOKEN === 'string'
        ? process.env.AI_PM_CODEX_EMBEDDED_GITHUB_TOKEN.trim()
        : '';
    const effectiveToken = bodyToken || headerToken || envToken;

    const responseBody = {
      pullRequestUrl,
      pullRequestNumber,
      status: 'queued',
      branchName,
      message: 'Embedded Codex delegation server accepted the request.',
      metadata: {
        requestId,
        receivedAt,
        repositoryUrl,
        branchName,
        prTitle,
        projectUrl:
          typeof payload.projectUrl === 'string' ? payload.projectUrl.trim() : '',
        story,
        server: {
          endpoint: `${context.protocol}://${formatHost(context.host)}:${context.port}${context.path}`,
        },
      },
    };

    const githubResult = await maybeCreateGitHubPullRequest({
      repositoryUrl,
      prTitle,
      prBody,
      branchName,
      token: effectiveToken,
      story,
      requestId,
    });

    if (githubResult.fatal) {
      const status = githubResult.statusCode || 502;
      res.writeHead(status, headers);
      res.end(
        JSON.stringify({
          message: githubResult.message || 'Failed to create pull request on GitHub.',
          code: githubResult.code,
          details: githubResult.details,
        })
      );
      return;
    }

    if (githubResult.metadata) {
      responseBody.metadata.github = githubResult.metadata;
    }

    if (githubResult.success) {
      responseBody.pullRequestUrl = githubResult.pullRequestUrl || responseBody.pullRequestUrl;
      responseBody.pullRequestNumber =
        githubResult.pullRequestNumber ?? responseBody.pullRequestNumber;
      responseBody.status = githubResult.status || 'open';
      responseBody.branchName = githubResult.branchName || responseBody.branchName;
      responseBody.message =
        githubResult.message || 'GitHub pull request created successfully.';
    }

    res.writeHead(200, headers);
    res.end(JSON.stringify(responseBody));
  } catch (error) {
    console.error('Embedded Codex delegation request failed', error);
    res.writeHead(500, headers);
    res.end(JSON.stringify({ message: 'Embedded delegation failed to process the request.' }));
  }
}

function extractAuthorizationHeader(headers = {}) {
  if (!headers || typeof headers !== 'object') {
    return '';
  }
  const direct = headers.authorization || headers.Authorization;
  return typeof direct === 'string' ? direct : '';
}

function extractBearerToken(header) {
  if (typeof header !== 'string') {
    return '';
  }
  const trimmed = header.trim();
  if (!trimmed) {
    return '';
  }
  const match = trimmed.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

async function maybeCreateGitHubPullRequest({
  repositoryUrl,
  prTitle,
  prBody,
  branchName,
  token,
  story,
  requestId,
}) {
  const repoInfo = parseGitHubRepository(repositoryUrl);
  if (!repoInfo) {
    return { skipped: true };
  }

  const effectiveToken = typeof token === 'string' ? token.trim() : '';
  if (!effectiveToken) {
    return {
      fatal: true,
      statusCode: 401,
      code: 'GITHUB_TOKEN_REQUIRED',
      message:
        'GitHub token is required to create a pull request. Provide AI_PM_CODEX_DELEGATION_TOKEN or enter a token in the delegation modal.',
      details: { repository: `${repoInfo.owner}/${repoInfo.repo}` },
    };
  }

  try {
    const repo = await githubRequest('GET', `/repos/${repoInfo.owner}/${repoInfo.repo}`, {
      token: effectiveToken,
    });
    const baseBranch = repo?.data?.default_branch || 'main';

    const baseRef = await githubRequest(
      'GET',
      `/repos/${repoInfo.owner}/${repoInfo.repo}/git/ref/${encodeURIComponent(`heads/${baseBranch}`)}`,
      { token: effectiveToken }
    );
    const baseSha = baseRef?.data?.object?.sha;
    if (!baseSha) {
      throw Object.assign(new Error('Unable to resolve default branch commit'), {
        statusCode: 502,
        code: 'GITHUB_BASE_REF_MISSING',
      });
    }

    const createRef = await githubRequest(
      'POST',
      `/repos/${repoInfo.owner}/${repoInfo.repo}/git/refs`,
      {
        token: effectiveToken,
        body: { ref: `refs/heads/${branchName}`, sha: baseSha },
        acceptStatus: [422],
      }
    );

    if (createRef.status === 201) {
      // branch created successfully
    } else if (createRef.status === 422) {
      // Branch already exists; ensure it is reachable so subsequent steps work.
      await githubRequest(
        'GET',
        `/repos/${repoInfo.owner}/${repoInfo.repo}/git/ref/${encodeURIComponent(`heads/${branchName}`)}`,
        { token: effectiveToken }
      );
    }

    const placeholderPath = buildGitHubPlaceholderPath(requestId);
    const placeholderContent = buildGitHubPlaceholderContent({
      story,
      prTitle,
      prBody,
      branchName,
      repositoryUrl,
    });

    const commit = await githubRequest(
      'PUT',
      `/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${encodeGitHubPath(placeholderPath)}`,
      {
        token: effectiveToken,
        body: {
          message: `Codex delegation scaffold for ${story?.title || 'user story'}`,
          content: Buffer.from(placeholderContent, 'utf8').toString('base64'),
          branch: branchName,
          committer: {
            name: 'AIPM Codex Bot',
            email: 'codex-bot@example.com',
          },
        },
      }
    );

    const pr = await githubRequest('POST', `/repos/${repoInfo.owner}/${repoInfo.repo}/pulls`, {
      token: effectiveToken,
      body: {
        title: prTitle,
        head: branchName,
        base: baseBranch,
        body: prBody || undefined,
      },
    });

    return {
      success: true,
      pullRequestUrl: pr?.data?.html_url || '',
      pullRequestNumber: pr?.data?.number ?? null,
      status: pr?.data?.state || 'open',
      branchName: pr?.data?.head?.ref || branchName,
      message: 'GitHub pull request created.',
      metadata: {
        repository: `${repoInfo.owner}/${repoInfo.repo}`,
        baseBranch,
        placeholderPath,
        commitSha: commit?.data?.commit?.sha || null,
        requestId,
        pullRequestApiUrl: pr?.data?.url || '',
      },
    };
  } catch (error) {
    if (error && typeof error === 'object' && !error.fatal) {
      return {
        fatal: true,
        statusCode: error.statusCode || 502,
        code: error.code,
        message:
          error.message || 'GitHub integration failed while creating the pull request.',
        details: error.details,
      };
    }
    throw error;
  }
}

function buildGitHubPlaceholderContent({
  story,
  prTitle,
  prBody,
  branchName,
  repositoryUrl,
}) {
  const lines = [
    '# Codex Delegation Placeholder',
    '',
    `- Repository: ${repositoryUrl}`,
    `- Branch: ${branchName}`,
  ];
  if (story?.id != null) {
    lines.push(`- Story ID: ${story.id}`);
  }
  if (story?.title) {
    lines.push(`- Story Title: ${story.title}`);
  }
  if (story?.status) {
    lines.push(`- Story Status: ${story.status}`);
  }
  if (story?.assigneeEmail) {
    lines.push(`- Assignee: ${story.assigneeEmail}`);
  }
  lines.push('');
  lines.push('## Pull Request Title');
  lines.push(prTitle);
  if (prBody) {
    lines.push('');
    lines.push('## Pull Request Body');
    lines.push(prBody);
  }
  lines.push('');
  lines.push('> This file was generated by the embedded Codex delegation server. Replace it with the implementation generated by Codex or remove it before merging.');
  return lines.join('\n');
}

function buildGitHubPlaceholderPath(requestId) {
  const safeId = typeof requestId === 'string' ? requestId : randomUUID();
  return `codex-delegation/${safeId}.md`;
}

function encodeGitHubPath(pathname) {
  return pathname
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function parseGitHubRepository(url) {
  try {
    const parsed = new URL(url);
    if (!/github\.com$/i.test(parsed.hostname)) {
      return null;
    }
    const segments = parsed.pathname.replace(/\.git$/, '').split('/').filter(Boolean);
    if (segments.length < 2) {
      return null;
    }
    return { owner: segments[0], repo: segments[1] };
  } catch (error) {
    return null;
  }
}

async function githubRequest(method, path, { token, body, acceptStatus = [] } = {}) {
  const url = `${DEFAULT_GITHUB_API_BASE}${path}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'aipm-codex-embedded-server',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  let serializedBody;
  if (body != null) {
    serializedBody = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: serializedBody,
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

  if (!response.ok && !acceptStatus.includes(response.status)) {
    const error = new Error(
      data && typeof data === 'object' && data.message
        ? data.message
        : `GitHub request failed with status ${response.status}`
    );
    error.statusCode = response.status;
    if (data && typeof data === 'object') {
      error.details = data;
    }
    throw error;
  }

  return { status: response.status, data };
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

function allocatePullRequestNumber() {
  prCounter += 1;
  return prCounter;
}

function derivePullRequestUrl(repositoryUrl, pullRequestNumber) {
  try {
    const parsed = new URL(repositoryUrl);
    if (parsed.hostname === 'github.com') {
      const path = parsed.pathname.replace(/\.git$/, '').replace(/\/+$/, '');
      const segments = path.split('/').filter(Boolean);
      if (segments.length >= 2) {
        return `https://github.com/${segments[0]}/${segments[1]}/pull/${pullRequestNumber}`;
      }
    }
  } catch (error) {
    // ignore and use fallback
  }
  const clean = repositoryUrl.replace(/\/+$/, '');
  return `${clean}/pull/${pullRequestNumber}`;
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

function normalizeGitHubApiBase(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'https://api.github.com';
  }
  return value.replace(/\/+$/, '');
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
