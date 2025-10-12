import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'public');
const DATA_DIR = path.join(__dirname, 'data');
export const DATABASE_PATH = path.join(DATA_DIR, 'app.sqlite');

function now() {
  return new Date().toISOString();
}

function ensureArray(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (value == null) return [];
  return [String(value).trim()].filter(Boolean);
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function investWarnings(story) {
  const warnings = [];
  if (!story.asA || !story.asA.trim()) {
    warnings.push({ criterion: 'valuable', message: 'Story must describe the persona in “As a”.' });
  }
  if (!story.iWant || !story.iWant.trim()) {
    warnings.push({ criterion: 'negotiable', message: 'Add a concrete goal in “I want”.' });
  }
  if (!story.soThat || !story.soThat.trim()) {
    warnings.push({ criterion: 'valuable', message: 'Capture the benefit in “So that”.' });
  }
  if (story.title && story.title.trim().length < 8) {
    warnings.push({ criterion: 'independent', message: 'Title is short; clarify scope in a few more words.' });
  }
  return warnings;
}

const MEASURABLE_PATTERN = /([0-9]+\s*(ms|s|sec|seconds?|minutes?|hours?|%|percent|users?|items?|requests?|errors?))/i;

function measurabilityWarnings(thenSteps) {
  const warnings = [];
  const suggestions = [];
  thenSteps.forEach((step, index) => {
    if (!MEASURABLE_PATTERN.test(step)) {
      warnings.push({
        index,
        message: `Then step ${index + 1} lacks a measurable outcome.`,
      });
      suggestions.push(
        `Then step ${index + 1}: add a numeric goal such as “within 2s”, “<1% errors”, or “at least 5 users displayed”.`
      );
    }
  });
  return { warnings, suggestions };
}

function tableColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

function ensureColumn(db, table, name, definition) {
  const existing = tableColumns(db, table).some((column) => column.name === name);
  if (!existing) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition};`);
  }
}

function ensureNotNullDefaults(db) {
  db.exec(`
    UPDATE user_stories SET description = '' WHERE description IS NULL;
    UPDATE user_stories SET as_a = '' WHERE as_a IS NULL;
    UPDATE user_stories SET i_want = '' WHERE i_want IS NULL;
    UPDATE user_stories SET so_that = '' WHERE so_that IS NULL;
    UPDATE user_stories SET assignee_email = '' WHERE assignee_email IS NULL;
    UPDATE user_stories SET status = 'Draft' WHERE status IS NULL;
    UPDATE acceptance_tests SET status = 'Draft' WHERE status IS NULL;
    UPDATE reference_documents SET name = '' WHERE name IS NULL;
    UPDATE reference_documents SET url = '' WHERE url IS NULL;
  `);
}

async function ensureDatabase() {
  await mkdir(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DATABASE_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS user_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mr_id INTEGER DEFAULT 1,
      parent_id INTEGER,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      as_a TEXT DEFAULT '',
      i_want TEXT DEFAULT '',
      so_that TEXT DEFAULT '',
      story_point INTEGER,
      assignee_email TEXT DEFAULT '',
      status TEXT DEFAULT 'Draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(parent_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS acceptance_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      given TEXT NOT NULL,
      when_step TEXT NOT NULL,
      then_step TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS reference_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
  `);

  ensureColumn(db, 'user_stories', 'mr_id', 'mr_id INTEGER DEFAULT 1');
  ensureColumn(db, 'user_stories', 'parent_id', 'parent_id INTEGER');
  ensureColumn(db, 'user_stories', 'description', "description TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'as_a', "as_a TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'i_want', "i_want TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'so_that', "so_that TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'story_point', 'story_point INTEGER');
  ensureColumn(db, 'user_stories', 'assignee_email', "assignee_email TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'status', "status TEXT DEFAULT 'Draft'");
  ensureColumn(db, 'user_stories', 'created_at', 'created_at TEXT');
  ensureColumn(db, 'user_stories', 'updated_at', 'updated_at TEXT');

  ensureColumn(db, 'acceptance_tests', 'given', "given TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, 'acceptance_tests', 'when_step', "when_step TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, 'acceptance_tests', 'then_step', "then_step TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, 'acceptance_tests', 'status', "status TEXT DEFAULT 'Draft'");
  ensureColumn(db, 'acceptance_tests', 'created_at', 'created_at TEXT');
  ensureColumn(db, 'acceptance_tests', 'updated_at', 'updated_at TEXT');

  ensureColumn(db, 'reference_documents', 'name', "name TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'reference_documents', 'url', "url TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'reference_documents', 'created_at', 'created_at TEXT');
  ensureColumn(db, 'reference_documents', 'updated_at', 'updated_at TEXT');

  ensureNotNullDefaults(db);

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM user_stories');
  const { count } = countStmt.get();
  if (count === 0) {
    const timestamp = now();
    const insertStory = db.prepare(
      'INSERT INTO user_stories (title, description, as_a, i_want, so_that, story_point, assignee_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
    );
    const { lastInsertRowid: rootId } = insertStory.run(
      'Enable secure login',
      'As an existing customer I want to sign in quickly so I can reach my dashboard without friction.',
      'Authenticated customer',
      'sign in with email and password',
      'access my personalized dashboard immediately',
      5,
      'pm@example.com',
      'Ready',
      timestamp,
      timestamp
    );

    const insertChild = db.prepare(
      'INSERT INTO user_stories (mr_id, parent_id, title, description, as_a, i_want, so_that, story_point, assignee_email, status, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
    );
    insertChild.run(
      rootId,
      'Render login form',
      'As a returning customer I want a familiar login form so that I can authenticate without confusion.',
      'Returning customer',
      'view the login form instantly',
      'enter my credentials without delay',
      3,
      'designer@example.com',
      'Draft',
      timestamp,
      timestamp
    );

    const insertTest = db.prepare(
      'INSERT INTO acceptance_tests (story_id, given, when_step, then_step, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
    );
    insertTest.run(
      rootId,
      JSON.stringify(['A customer with valid credentials']),
      JSON.stringify(['They submit the login form']),
      JSON.stringify(['Dashboard loads within 2000 ms']),
      'Ready',
      timestamp,
      timestamp
    );

    const insertDoc = db.prepare(
      'INSERT INTO reference_documents (story_id, name, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)' // prettier-ignore
    );
    insertDoc.run(rootId, 'Security checklist', 'https://example.com/security.pdf', timestamp, timestamp);
  }

  return db;
}

function attachChildren(stories) {
  const byId = new Map();
  stories.forEach((story) => {
    story.children = [];
    byId.set(story.id, story);
  });
  const roots = [];
  stories.forEach((story) => {
    if (story.parentId && byId.has(story.parentId)) {
      byId.get(story.parentId).children.push(story);
    } else {
      roots.push(story);
    }
  });
  return { roots, byId };
}

function flattenStories(nodes) {
  const result = [];
  nodes.forEach((node) => {
    result.push(node);
    if (node.children && node.children.length > 0) {
      result.push(...flattenStories(node.children));
    }
  });
  return result;
}

function loadStories(db) {
  const storyRows = db
    .prepare('SELECT * FROM user_stories ORDER BY (parent_id IS NOT NULL), parent_id, id')
    .all();
  const testRows = db.prepare('SELECT * FROM acceptance_tests ORDER BY story_id, id').all();
  const docRows = db.prepare('SELECT * FROM reference_documents ORDER BY story_id, id').all();

  const stories = storyRows.map((row) => {
    const story = {
      id: row.id,
      mrId: row.mr_id,
      parentId: row.parent_id,
      title: row.title,
      description: row.description ?? '',
      asA: row.as_a ?? '',
      iWant: row.i_want ?? '',
      soThat: row.so_that ?? '',
      storyPoint: row.story_point,
      assigneeEmail: row.assignee_email ?? '',
      status: row.status ?? 'Draft',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      acceptanceTests: [],
      referenceDocuments: [],
    };
    const warnings = investWarnings(story);
    story.investWarnings = warnings;
    story.investSatisfied = warnings.length === 0;
    return story;
  });

  const { roots, byId } = attachChildren(stories);

  testRows.forEach((row) => {
    const story = byId.get(row.story_id);
    if (!story) return;
    const given = parseJsonArray(row.given);
    const when = parseJsonArray(row.when_step);
    const then = parseJsonArray(row.then_step);
    const { warnings, suggestions } = measurabilityWarnings(then);
    story.acceptanceTests.push({
      id: row.id,
      storyId: row.story_id,
      given,
      when,
      then,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      measurabilityWarnings: warnings,
      measurabilitySuggestions: suggestions,
    });
  });

  docRows.forEach((row) => {
    const story = byId.get(row.story_id);
    if (!story) return;
    story.referenceDocuments.push({
      id: row.id,
      storyId: row.story_id,
      name: row.name,
      url: row.url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });

  return roots;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

async function parseJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 });
  }
}

function measurablePayload(payload) {
  const given = ensureArray(payload.given);
  const when = ensureArray(payload.when);
  const then = ensureArray(payload.then);
  if (given.length === 0 || when.length === 0 || then.length === 0) {
    throw Object.assign(new Error('Given/When/Then require at least one entry'), { statusCode: 400 });
  }
  return { given, when, then };
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let filePath = path.join(FRONTEND_DIR, url.pathname);
  if (url.pathname === '/' || url.pathname === '') {
    filePath = path.join(FRONTEND_DIR, 'index.html');
  }
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.html'
        ? 'text/html; charset=utf-8'
        : ext === '.css'
        ? 'text/css; charset=utf-8'
        : ext === '.js'
        ? 'application/javascript; charset=utf-8'
        : 'application/octet-stream';
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(body);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
}

export async function createApp() {
  const db = await ensureDatabase();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    const method = req.method ?? 'GET';

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (pathname === '/api/stories' && method === 'GET') {
      const stories = loadStories(db);
      sendJson(res, 200, stories);
      return;
    }

    if (pathname === '/api/stories' && method === 'POST') {
      try {
        const payload = await parseJson(req);
        const title = String(payload.title ?? '').trim();
        if (!title) {
          throw Object.assign(new Error('Title is required'), { statusCode: 400 });
        }
        const asA = String(payload.asA ?? '').trim();
        const iWant = String(payload.iWant ?? '').trim();
        const soThat = String(payload.soThat ?? '').trim();
        const description = String(payload.description ?? '').trim();
        const storyPoint = payload.storyPoint == null || payload.storyPoint === '' ? null : Number(payload.storyPoint);
        const assigneeEmail = String(payload.assigneeEmail ?? '').trim();
        const parentId = payload.parentId == null ? null : Number(payload.parentId);
        const warnings = investWarnings({ asA, iWant, soThat, title });
        if (warnings.length > 0 && !payload.acceptWarnings) {
          sendJson(res, 409, {
            code: 'INVEST_WARNINGS',
            message: 'User story does not meet INVEST criteria.',
            warnings,
          });
          return;
        }
        const timestamp = now();
        const statement = db.prepare(
          'INSERT INTO user_stories (mr_id, parent_id, title, description, as_a, i_want, so_that, story_point, assignee_email, status, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
        );
        const { lastInsertRowid } = statement.run(
          parentId,
          title,
          description,
          asA,
          iWant,
          soThat,
          storyPoint,
          assigneeEmail,
          'Draft',
          timestamp,
          timestamp
        );
        const created = flattenStories(loadStories(db)).find(
          (story) => story.id === Number(lastInsertRowid)
        );
        sendJson(res, 201, created ?? null);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to create story' });
      }
      return;
    }

    const storyIdMatch = pathname.match(/^\/api\/stories\/(\d+)$/);
    if (storyIdMatch && method === 'PATCH') {
      const storyId = Number(storyIdMatch[1]);
      try {
        const payload = await parseJson(req);
        const title = String(payload.title ?? '').trim();
        if (!title) {
          throw Object.assign(new Error('Title is required'), { statusCode: 400 });
        }
        const description = String(payload.description ?? '').trim();
        const storyPoint = payload.storyPoint == null || payload.storyPoint === '' ? null : Number(payload.storyPoint);
        const assigneeEmail = String(payload.assigneeEmail ?? '').trim();
        const asA = payload.asA != null ? String(payload.asA).trim() : undefined;
        const iWant = payload.iWant != null ? String(payload.iWant).trim() : undefined;
        const soThat = payload.soThat != null ? String(payload.soThat).trim() : undefined;

        const existingStmt = db.prepare('SELECT * FROM user_stories WHERE id = ?');
        const existing = existingStmt.get(storyId);
        if (!existing) {
          throw Object.assign(new Error('Story not found'), { statusCode: 404 });
        }

        const storyForValidation = {
          title,
          asA: asA ?? existing.as_a,
          iWant: iWant ?? existing.i_want,
          soThat: soThat ?? existing.so_that,
        };
        const warnings = investWarnings(storyForValidation);
        if (warnings.length > 0 && !payload.acceptWarnings) {
          sendJson(res, 409, {
            code: 'INVEST_WARNINGS',
            message: 'User story does not meet INVEST criteria.',
            warnings,
          });
          return;
        }

        const update = db.prepare(
          'UPDATE user_stories SET title = ?, description = ?, story_point = ?, assignee_email = ?, as_a = ?, i_want = ?, so_that = ?, updated_at = ? WHERE id = ?' // prettier-ignore
        );
        update.run(
          title,
          description,
          storyPoint,
          assigneeEmail,
          asA ?? existing.as_a,
          iWant ?? existing.i_want,
          soThat ?? existing.so_that,
          now(),
          storyId
        );
        const updated = flattenStories(loadStories(db)).find((story) => story.id === storyId);
        sendJson(res, 200, updated ?? null);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to update story' });
      }
      return;
    }

    if (storyIdMatch && method === 'DELETE') {
      const storyId = Number(storyIdMatch[1]);
      const statement = db.prepare('DELETE FROM user_stories WHERE id = ?');
      const result = statement.run(storyId);
      if (result.changes === 0) {
        sendJson(res, 404, { message: 'Story not found' });
      } else {
        sendJson(res, 204, {});
      }
      return;
    }

    const testCreateMatch = pathname.match(/^\/api\/stories\/(\d+)\/tests$/);
    if (testCreateMatch && method === 'POST') {
      const storyId = Number(testCreateMatch[1]);
      try {
        const payload = await parseJson(req);
        const { given, when, then } = measurablePayload(payload);
        const { warnings, suggestions } = measurabilityWarnings(then);
        if (warnings.length > 0 && !payload.acceptWarnings) {
          sendJson(res, 409, {
            code: 'MEASURABILITY_WARNINGS',
            message: 'Then steps must be measurable.',
            warnings,
            suggestions,
          });
          return;
        }
        const statement = db.prepare(
          'INSERT INTO acceptance_tests (story_id, given, when_step, then_step, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
        );
        const timestamp = now();
        const { lastInsertRowid } = statement.run(
          storyId,
          JSON.stringify(given),
          JSON.stringify(when),
          JSON.stringify(then),
          payload.status ? String(payload.status) : 'Draft',
          timestamp,
          timestamp
        );
        const story = flattenStories(loadStories(db)).find((node) => node.id === storyId);
        const created = story?.acceptanceTests.find((item) => item.id === Number(lastInsertRowid)) ?? null;
        sendJson(res, 201, created);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to create acceptance test' });
      }
      return;
    }

    const testIdMatch = pathname.match(/^\/api\/tests\/(\d+)$/);
    if (testIdMatch && method === 'PATCH') {
      const testId = Number(testIdMatch[1]);
      try {
        const payload = await parseJson(req);
        const { given, when, then } = measurablePayload(payload);
        const { warnings, suggestions } = measurabilityWarnings(then);
        if (warnings.length > 0 && !payload.acceptWarnings) {
          sendJson(res, 409, {
            code: 'MEASURABILITY_WARNINGS',
            message: 'Then steps must be measurable.',
            warnings,
            suggestions,
          });
          return;
        }
        const statement = db.prepare(
          'UPDATE acceptance_tests SET given = ?, when_step = ?, then_step = ?, status = ?, updated_at = ? WHERE id = ?' // prettier-ignore
        );
        statement.run(
          JSON.stringify(given),
          JSON.stringify(when),
          JSON.stringify(then),
          payload.status ? String(payload.status) : 'Draft',
          now(),
          testId
        );
        const test = flattenStories(loadStories(db))
          .flatMap((story) => story.acceptanceTests)
          .find((item) => item.id === testId);
        if (!test) {
          sendJson(res, 404, { message: 'Acceptance test not found' });
        } else {
          sendJson(res, 200, test);
        }
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to update acceptance test' });
      }
      return;
    }

    if (testIdMatch && method === 'DELETE') {
      const testId = Number(testIdMatch[1]);
      const statement = db.prepare('DELETE FROM acceptance_tests WHERE id = ?');
      const result = statement.run(testId);
      if (result.changes === 0) {
        sendJson(res, 404, { message: 'Acceptance test not found' });
      } else {
        sendJson(res, 204, {});
      }
      return;
    }

    const docCreateMatch = pathname.match(/^\/api\/stories\/(\d+)\/reference-documents$/);
    if (docCreateMatch && method === 'POST') {
      const storyId = Number(docCreateMatch[1]);
      try {
        const payload = await parseJson(req);
        const name = String(payload.name ?? '').trim();
        const urlValue = String(payload.url ?? '').trim();
        if (!name || !urlValue) {
          throw Object.assign(new Error('Name and URL are required'), { statusCode: 400 });
        }
        const statement = db.prepare(
          'INSERT INTO reference_documents (story_id, name, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)' // prettier-ignore
        );
        const timestamp = now();
        const { lastInsertRowid } = statement.run(storyId, name, urlValue, timestamp, timestamp);
        const story = flattenStories(loadStories(db)).find((node) => node.id === storyId);
        const created = story?.referenceDocuments.find((doc) => doc.id === Number(lastInsertRowid)) ?? null;
        sendJson(res, 201, created);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to create reference document' });
      }
      return;
    }

    const docIdMatch = pathname.match(/^\/api\/reference-documents\/(\d+)$/);
    if (docIdMatch && method === 'DELETE') {
      const docId = Number(docIdMatch[1]);
      const statement = db.prepare('DELETE FROM reference_documents WHERE id = ?');
      const result = statement.run(docId);
      if (result.changes === 0) {
        sendJson(res, 404, { message: 'Reference document not found' });
      } else {
        sendJson(res, 204, {});
      }
      return;
    }

    await serveStatic(req, res);
  });

  server.on('close', () => {
    db.close();
  });

  return server;
}

export async function startServer(port = 4000) {
  const app = await createApp();
  return new Promise((resolve, reject) => {
    app.listen(port, () => resolve(app));
    app.once('error', reject);
  });
}
