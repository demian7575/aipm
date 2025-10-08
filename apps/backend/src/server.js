import { createServer } from 'node:http';
import { statSync, createReadStream } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { store } from './store.js';
import { buildOpenApiDocument } from '@ai-pm/shared';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const frontendDir = resolve(__dirname, '../../frontend/public');
const jsonResponse = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
};

const parseJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    const err = new Error('Invalid JSON body');
    err.code = 'request.invalidJson';
    throw err;
  }
};

const sendNotFound = (res) => jsonResponse(res, 404, { code: 'not_found', message: 'Resource not found' });

const wrapHandler = (handler) => async (req, res, params) => {
  try {
    await handler(req, res, params);
  } catch (error) {
    const status = error.code?.startsWith('mergeRequest') || error.code?.startsWith('story') || error.code?.startsWith('test')
      ? 400
      : 500;
    jsonResponse(res, status, {
      code: error.code ?? 'internal',
      message: error.message ?? 'Unexpected error',
      details: error.details
    });
  }
};

const routes = [];

const register = (method, pattern, handler) => {
  routes.push({ method, pattern, handler: wrapHandler(handler) });
};

register('GET', /^\/api\/merge-requests$/, async (req, res) => {
  jsonResponse(res, 200, store.listMergeRequests());
});

register('POST', /^\/api\/merge-requests$/, async (req, res) => {
  const body = await parseJsonBody(req);
  const result = store.createMergeRequest(body);
  jsonResponse(res, 201, result);
});

register('GET', /^\/api\/merge-requests\/([a-f0-9-]+)$/i, async (req, res, params) => {
  const mr = store.getMergeRequest(params[1]);
  jsonResponse(res, 200, mr);
});

register('PATCH', /^\/api\/merge-requests\/([a-f0-9-]+)$/, async (req, res, params) => {
  const body = await parseJsonBody(req);
  const mr = store.updateMergeRequest(params[1], body);
  jsonResponse(res, 200, mr);
});

register('DELETE', /^\/api\/merge-requests\/([a-f0-9-]+)$/, async (req, res, params) => {
  const result = store.deleteMergeRequest(params[1]);
  jsonResponse(res, 200, result);
});

register('PATCH', /^\/api\/merge-requests\/([a-f0-9-]+)\/status$/, async (req, res, params) => {
  const body = await parseJsonBody(req);
  const mr = store.setMergeRequestStatus(params[1], body.status);
  jsonResponse(res, 200, mr);
});

register('POST', /^\/api\/merge-requests\/([a-f0-9-]+)\/update-branch$/, async (req, res, params) => {
  const mr = store.updateBranch(params[1]);
  jsonResponse(res, 200, mr);
});

register('GET', /^\/api\/stories$/, async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const mrId = url.searchParams.get('mrId') ?? undefined;
  const stories = store.listStories({ mrId });
  jsonResponse(res, 200, stories);
});

register('POST', /^\/api\/stories$/, async (req, res) => {
  const body = await parseJsonBody(req);
  const story = store.createStory(body);
  jsonResponse(res, 201, story);
});

register('GET', /^\/api\/stories\/([a-f0-9-]+)$/i, async (req, res, params) => {
  const story = store.getStory(params[1]);
  jsonResponse(res, 200, story);
});

register('PATCH', /^\/api\/stories\/([a-f0-9-]+)$/, async (req, res, params) => {
  const body = await parseJsonBody(req);
  const story = store.updateStory(params[1], body);
  jsonResponse(res, 200, story);
});

register('DELETE', /^\/api\/stories\/([a-f0-9-]+)$/, async (req, res, params) => {
  const result = store.deleteStory(params[1]);
  jsonResponse(res, 200, result);
});

register('PATCH', /^\/api\/stories\/([a-f0-9-]+)\/status$/, async (req, res, params) => {
  const body = await parseJsonBody(req);
  const story = store.setStoryStatus(params[1], body.status);
  jsonResponse(res, 200, story);
});

register('PATCH', /^\/api\/stories\/([a-f0-9-]+)\/move$/, async (req, res, params) => {
  const body = await parseJsonBody(req);
  const story = store.moveStory(params[1], { parentId: body.parentId ?? null, index: body.index });
  jsonResponse(res, 200, story);
});

register('PATCH', /^\/api\/stories\/([a-f0-9-]+)\/reorder$/, async (req, res, params) => {
  const body = await parseJsonBody(req);
  const story = store.reorderStory(params[1], { order: body.order });
  jsonResponse(res, 200, story);
});

register('GET', /^\/api\/stories\/([a-f0-9-]+)\/path$/, async (req, res, params) => {
  const path = store.getStoryPath(params[1]);
  jsonResponse(res, 200, path);
});

register('GET', /^\/api\/stories\/([a-f0-9-]+)\/children$/, async (req, res, params) => {
  const children = store.getStoryChildren(params[1]);
  jsonResponse(res, 200, children);
});

register('GET', /^\/api\/stories\/tree$/, async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const mrId = url.searchParams.get('mrId');
  if (!mrId) {
    jsonResponse(res, 400, { code: 'story.mrRequired', message: 'mrId query parameter required' });
    return;
  }
  const depth = url.searchParams.has('depth') ? Number(url.searchParams.get('depth')) : undefined;
  const tree = store.getStoryTree({ mrId, depth: Number.isFinite(depth) ? depth : undefined });
  jsonResponse(res, 200, tree);
});

register('GET', /^\/api\/tests$/, async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const storyId = url.searchParams.get('storyId') ?? undefined;
  const tests = store.listTests({ storyId });
  jsonResponse(res, 200, tests);
});

register('POST', /^\/api\/tests$/, async (req, res) => {
  const body = await parseJsonBody(req);
  const test = store.createTest(body);
  jsonResponse(res, 201, test);
});

register('GET', /^\/api\/tests\/([a-f0-9-]+)$/i, async (req, res, params) => {
  const test = store.getTest(params[1]);
  jsonResponse(res, 200, test);
});

register('PATCH', /^\/api\/tests\/([a-f0-9-]+)$/, async (req, res, params) => {
  const body = await parseJsonBody(req);
  const test = store.updateTest(params[1], body);
  jsonResponse(res, 200, test);
});

register('DELETE', /^\/api\/tests\/([a-f0-9-]+)$/, async (req, res, params) => {
  const result = store.deleteTest(params[1]);
  jsonResponse(res, 200, result);
});

register('GET', /^\/api\/rollup\/([a-f0-9-]+)$/i, async (req, res, params) => {
  const rollup = store.rollup(params[1]);
  jsonResponse(res, 200, rollup);
});

register('GET', /^\/api\/state$/, async (req, res) => {
  jsonResponse(res, 200, store.getState());
});

register('POST', /^\/api\/reset$/, async (req, res) => {
  store.seed();
  jsonResponse(res, 200, { ok: true });
});

const openApiDocument = buildOpenApiDocument();

register('GET', /^\/api\/openapi.json$/, async (req, res) => {
  jsonResponse(res, 200, openApiDocument);
});

const serveStatic = (req, res) => {
  try {
    let filePath = join(frontendDir, req.url.replace(/^\/+/, ''));
    if (req.url === '/' || req.url === '') {
      filePath = join(frontendDir, 'index.html');
    }
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
    const ext = extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml'
    };
    const stream = createReadStream(filePath);
    res.writeHead(200, {
      'Content-Type': types[ext] ?? 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    stream.pipe(res);
    stream.on('error', () => sendNotFound(res));
  } catch (error) {
    sendNotFound(res);
  }
};

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const route = routes.find((entry) => entry.method === req.method && entry.pattern.test(req.url.split('?')[0]));
  if (route) {
    const params = route.pattern.exec(req.url.split('?')[0]);
    await route.handler(req, res, params ?? []);
    return;
  }

  if (req.url.startsWith('/api/')) {
    sendNotFound(res);
    return;
  }

  serveStatic(req, res);
});

const normalizeOptions = (options) => {
  if (typeof options === 'number') {
    return { port: options };
  }
  return options ?? {};
};

export const startServer = (options) => {
  const config = normalizeOptions(options);
  const port = Number(config.port ?? process.env.PORT ?? 4000);

  if (config.forceSeed) {
    store.seed();
  } else if (config.seed !== false) {
    store.seedIfEmpty();
  }

  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`Backend listening on http://localhost:${port}`);
      resolve(server);
    });
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
