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

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function mapStory(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    storyPoint: row.story_point,
    assigneeEmail: row.assignee_email,
    createdAt: row.created_at,
  };
}

async function ensureDatabase() {
  await mkdir(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DATABASE_PATH);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS user_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      story_point INTEGER DEFAULT NULL,
      assignee_email TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS acceptance_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      expected_result TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (story_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS reference_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (story_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
  `);

  const countStmt = db.prepare('SELECT COUNT(*) AS count FROM user_stories');
  const { count } = countStmt.get();
  if (count === 0) {
    const now = new Date().toISOString();
    const insertStory = db.prepare(
      'INSERT INTO user_stories (title, description, story_point, assignee_email, created_at) VALUES (?, ?, ?, ?, ?)' // prettier-ignore
    );
    const { lastInsertRowid: storyId } = insertStory.run(
      'Enable user login',
      'As a user I want to login so that I can access my dashboard.',
      5,
      'pm@example.com',
      now
    );

    const insertTest = db.prepare(
      'INSERT INTO acceptance_tests (story_id, title, expected_result, created_at) VALUES (?, ?, ?, ?)' // prettier-ignore
    );
    insertTest.run(
      storyId,
      'Given valid credentials when submitting login form then dashboard appears within 2 seconds',
      'Dashboard appears',
      now
    );

    const insertDoc = db.prepare(
      'INSERT INTO reference_documents (story_id, name, url, created_at) VALUES (?, ?, ?, ?)' // prettier-ignore
    );
    insertDoc.run(storyId, 'Design Spec', 'https://example.com/design', now);
  }

  return db;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Invalid JSON body');
  }
}

async function handleApiRequest(req, res, db) {
  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;
  const method = req.method ?? 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return true;
  }

  if (pathname === '/api/stories' && method === 'GET') {
    const stories = db.prepare('SELECT * FROM user_stories ORDER BY id').all();
    const storyIds = stories.map((story) => story.id);
    let acceptanceTests = [];
    let referenceDocs = [];
    if (storyIds.length > 0) {
      const placeholders = storyIds.map(() => '?').join(',');
      acceptanceTests = db
        .prepare(`SELECT * FROM acceptance_tests WHERE story_id IN (${placeholders}) ORDER BY id`)
        .all(...storyIds);
      referenceDocs = db
        .prepare(`SELECT * FROM reference_documents WHERE story_id IN (${placeholders}) ORDER BY id`)
        .all(...storyIds);
    }

    const testsByStory = new Map();
    for (const test of acceptanceTests) {
      const existing = testsByStory.get(test.story_id) ?? [];
      existing.push({
        id: test.id,
        title: test.title,
        expectedResult: test.expected_result,
        createdAt: test.created_at,
      });
      testsByStory.set(test.story_id, existing);
    }

    const docsByStory = new Map();
    for (const doc of referenceDocs) {
      const existing = docsByStory.get(doc.story_id) ?? [];
      existing.push({
        id: doc.id,
        name: doc.name,
        url: doc.url,
        createdAt: doc.created_at,
      });
      docsByStory.set(doc.story_id, existing);
    }

    sendJson(
      res,
      200,
      stories.map((story) => ({
        ...mapStory(story),
        acceptanceTests: testsByStory.get(story.id) ?? [],
        referenceDocuments: docsByStory.get(story.id) ?? [],
      }))
    );
    return true;
  }

  if (pathname === '/api/stories' && method === 'POST') {
    let payload;
    try {
      payload = await parseJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { message: error.message });
      return true;
    }

    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    if (!title) {
      sendJson(res, 400, { message: 'Title is required' });
      return true;
    }

    const description = typeof payload.description === 'string' ? payload.description : '';
    const storyPoint = Number.isFinite(payload.storyPoint) ? Number(payload.storyPoint) : null;
    const assigneeEmail = typeof payload.assigneeEmail === 'string' ? payload.assigneeEmail.trim() : '';

    const now = new Date().toISOString();
    const result = db
      .prepare(
        'INSERT INTO user_stories (title, description, story_point, assignee_email, created_at) VALUES (?, ?, ?, ?, ?)' // prettier-ignore
      )
      .run(title, description, storyPoint, assigneeEmail, now);
    const story = db.prepare('SELECT * FROM user_stories WHERE id = ?').get(result.lastInsertRowid);
    sendJson(res, 201, mapStory(story));
    return true;
  }

  const storyMatch = pathname.match(/^\/api\/stories\/(\d+)(.*)$/);
  if (storyMatch) {
    const storyId = Number(storyMatch[1]);
    const remainder = storyMatch[2];
    const story = db.prepare('SELECT * FROM user_stories WHERE id = ?').get(storyId);
    if (!story) {
      sendJson(res, 404, { message: 'Story not found' });
      return true;
    }

    if ((remainder === '' || remainder === '/') && method === 'PATCH') {
      let payload;
      try {
        payload = await parseJsonBody(req);
      } catch (error) {
        sendJson(res, 400, { message: error.message });
        return true;
      }

      const title = typeof payload.title === 'string' ? payload.title.trim() : story.title;
      const description = typeof payload.description === 'string' ? payload.description : story.description;
      const storyPoint =
        payload.storyPoint === null || payload.storyPoint === ''
          ? null
          : Number.isFinite(Number(payload.storyPoint))
          ? Number(payload.storyPoint)
          : story.story_point;
      const assigneeEmail =
        typeof payload.assigneeEmail === 'string' ? payload.assigneeEmail.trim() : story.assignee_email;

      db
        .prepare(
          'UPDATE user_stories SET title = ?, description = ?, story_point = ?, assignee_email = ? WHERE id = ?'
        )
        .run(title, description, storyPoint, assigneeEmail, storyId);

      const updated = db.prepare('SELECT * FROM user_stories WHERE id = ?').get(storyId);
      sendJson(res, 200, mapStory(updated));
      return true;
    }

    if (remainder.startsWith('/acceptance-tests')) {
      const testMatch = remainder.match(/^\/acceptance-tests(?:\/(\d+))?$/);
      if (!testMatch) {
        sendJson(res, 404, { message: 'Not found' });
        return true;
      }

      if (!testMatch[1] && method === 'POST') {
        let payload;
        try {
          payload = await parseJsonBody(req);
        } catch (error) {
          sendJson(res, 400, { message: error.message });
          return true;
        }

        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        if (!title) {
          sendJson(res, 400, { message: 'Title is required' });
          return true;
        }
        const expectedResult =
          typeof payload.expectedResult === 'string' ? payload.expectedResult.trim() : '';
        const now = new Date().toISOString();
        const result = db
          .prepare(
            'INSERT INTO acceptance_tests (story_id, title, expected_result, created_at) VALUES (?, ?, ?, ?)' // prettier-ignore
          )
          .run(storyId, title, expectedResult, now);
        sendJson(res, 201, {
          id: result.lastInsertRowid,
          storyId,
          title,
          expectedResult,
          createdAt: now,
        });
        return true;
      }

      if (testMatch[1] && method === 'DELETE') {
        const testId = Number(testMatch[1]);
        db.prepare('DELETE FROM acceptance_tests WHERE id = ?').run(testId);
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return true;
      }
    }

    if (remainder.startsWith('/reference-documents')) {
      const docMatch = remainder.match(/^\/reference-documents(?:\/(\d+))?$/);
      if (!docMatch) {
        sendJson(res, 404, { message: 'Not found' });
        return true;
      }

      if (!docMatch[1] && method === 'POST') {
        let payload;
        try {
          payload = await parseJsonBody(req);
        } catch (error) {
          sendJson(res, 400, { message: error.message });
          return true;
        }

        const name = typeof payload.name === 'string' ? payload.name.trim() : '';
        const urlValue = typeof payload.url === 'string' ? payload.url.trim() : '';
        if (!name || !urlValue) {
          sendJson(res, 400, { message: 'Name and URL are required' });
          return true;
        }
        const now = new Date().toISOString();
        const result = db
          .prepare('INSERT INTO reference_documents (story_id, name, url, created_at) VALUES (?, ?, ?, ?)')
          .run(storyId, name, urlValue, now);
        sendJson(res, 201, {
          id: result.lastInsertRowid,
          storyId,
          name,
          url: urlValue,
          createdAt: now,
        });
        return true;
      }

      if (docMatch[1] && method === 'DELETE') {
        const docId = Number(docMatch[1]);
        db.prepare('DELETE FROM reference_documents WHERE id = ?').run(docId);
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return true;
      }
    }
  }

  return false;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let relativePath = url.pathname;
  if (relativePath === '/') {
    relativePath = '/index.html';
  }
  const safePath = path.normalize(relativePath).replace(/^\.\/+/, '');
  const filePath = path.join(FRONTEND_DIR, safePath);
  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
    res.end(body);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
    }
  }
}

export async function createApp() {
  const db = await ensureDatabase();
  const server = createServer((req, res) => {
    handleApiRequest(req, res, db)
      .then((handled) => {
        if (handled) {
          return;
        }
        return serveStatic(req, res);
      })
      .catch((error) => {
        console.error('Unhandled request error', error);
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
        }
        res.end(JSON.stringify({ message: 'Internal server error' }));
      });
  });

  server.on('close', () => {
    try {
      db.close();
    } catch (error) {
      console.error('Failed to close database', error);
    }
  });

  return server;
}
