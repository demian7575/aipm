import { createServer } from 'node:http';
import { URL } from 'node:url';

const CODEX_AUTHOR_PATTERN = /codex/i;

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload ?? {});
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
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
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
    throw Object.assign(new Error(message), { statusCode: response.status || 502, details: data });
  }
  return data;
}

export async function performDelegation(payload) {
  const normalized = normalizeDelegatePayload(payload);
  const body = buildTaskBrief({ ...normalized, owner: normalized.owner, repo: normalized.repo });
  const repoPath = `/repos/${normalized.owner}/${normalized.repo}`;

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
  };
}

export async function handlePersonalDelegateRequest(req, res, url = new URL(req.url, 'http://localhost')) {
  try {
    if (req.method !== 'POST') {
      sendJson(res, 405, { message: 'Method not allowed' });
      return;
    }
    const payload = await readJson(req);
    const result = await performDelegation(payload);
    sendJson(res, 201, result);
  } catch (error) {
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
    sendJson(res, 200, response);
  } catch (error) {
    const status = error.statusCode && Number.isFinite(error.statusCode) ? error.statusCode : 500;
    const message = error.message || 'Failed to fetch Codex status';
    sendJson(res, status, { message });
  }
}

export function createDelegationServer(options = {}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const method = req.method ?? 'GET';

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      });
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
