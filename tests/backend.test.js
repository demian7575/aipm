import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createApp, DATABASE_PATH, openDatabase, resetDatabaseFactory } from '../apps/backend/app.js';

process.env.AI_PM_DISABLE_OPENAI = '1';
delete process.env.AI_PM_OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;

async function resetDatabaseFiles() {
  await fs.rm(DATABASE_PATH, { force: true });
  await fs.rm(`${DATABASE_PATH}.json`, { force: true });
}

async function startServer() {
  const app = await createApp();
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

test('stories CRUD with reference documents', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(Array.isArray(stories));
  assert.equal(stories.length, 1);
  const story = stories[0];
  assert.equal(story.storyPoint, 5);
  assert.equal(story.assigneeEmail, 'pm@example.com');
  assert.ok(story.investHealth);
  assert.equal(typeof story.investHealth.satisfied, 'boolean');
  assert.ok(Array.isArray(story.investHealth.issues));
  assert.ok(story.investAnalysis);
  assert.ok(Array.isArray(story.investAnalysis.aiWarnings));
  assert.ok(Array.isArray(story.investAnalysis.fallbackWarnings));
  assert.equal(typeof story.investAnalysis.usedFallback, 'boolean');
  assert.ok(['heuristic', 'fallback', 'openai'].includes(story.investAnalysis.source));
  assert.ok(
    story.investHealth.issues.every(
      (issue) => !/acceptance tests reach Pass status/i.test(issue.message)
    )
  );
  if (story.acceptanceTests.length) {
    assert.ok(story.acceptanceTests[0].gwtHealth);
    assert.equal(typeof story.acceptanceTests[0].gwtHealth.satisfied, 'boolean');
  }

  const patchResponse = await fetch(`${baseUrl}/api/stories/${story.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storyPoint: 8,
      assigneeEmail: 'owner@example.com',
      title: story.title,
      description: story.description,
    }),
  });
  assert.equal(patchResponse.status, 200);
  const updated = await patchResponse.json();
  assert.equal(updated.storyPoint, 8);
  assert.equal(updated.assigneeEmail, 'owner@example.com');

  const childResponse = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Child estimation',
      parentId: story.id,
      storyPoint: 3,
      assigneeEmail: 'engineer@example.com',
      description: 'Implements supporting UI',
      asA: 'User',
      iWant: 'complete a two-factor login',
      soThat: 'my account stays safe',
    }),
  });
  assert.equal(childResponse.status, 201);
  const child = await childResponse.json();
  assert.equal(child.storyPoint, 3);
  assert.ok(child.investHealth);
  assert.equal(child.investHealth.satisfied, false);
  assert.ok(child.investAnalysis);
  assert.ok(Array.isArray(child.investAnalysis.aiWarnings));
  assert.ok(Array.isArray(child.investAnalysis.fallbackWarnings));
  assert.ok(
    child.investHealth.issues.some((issue) =>
      /Add at least one acceptance test/i.test(issue.message)
    )
  );

  const invalidStoryPoint = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Bad estimation',
      storyPoint: -2,
      asA: 'User',
      iWant: 'do something',
      soThat: 'it works',
    }),
  });
  assert.equal(invalidStoryPoint.status, 400);
  const invalidBody = await invalidStoryPoint.json();
  assert.match(invalidBody.message, /Story point/i);

  const docResponse = await fetch(`${baseUrl}/api/stories/${story.id}/reference-documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'API Spec', url: 'https://example.com/api' }),
  });
  assert.equal(docResponse.status, 201);
  const doc = await docResponse.json();
  assert.equal(doc.name, 'API Spec');

  const uploadResponse = await fetch(`${baseUrl}/api/uploads?filename=checklist.txt`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: Buffer.from('Security review must cover 5 controls'),
  });
  assert.equal(uploadResponse.status, 201);
  const uploadInfo = await uploadResponse.json();
  assert.ok(uploadInfo.url.startsWith('/uploads/'));
  const uploadsDir = path.join(path.dirname(DATABASE_PATH), '..', 'uploads');
  const uploadPath = path.join(uploadsDir, path.basename(uploadInfo.url));
  await fs.access(uploadPath);

  const localDocResponse = await fetch(`${baseUrl}/api/stories/${story.id}/reference-documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Uploaded Checklist', url: uploadInfo.url }),
  });
  assert.equal(localDocResponse.status, 201);
  const localDoc = await localDocResponse.json();
  assert.equal(localDoc.name, 'Uploaded Checklist');

  const fileFetch = await fetch(`${baseUrl}${uploadInfo.url}`);
  assert.equal(fileFetch.status, 200);
  const fileText = await fileFetch.text();
  assert.match(fileText, /Security review/);

  const deleteLocal = await fetch(`${baseUrl}/api/reference-documents/${localDoc.id}`, {
    method: 'DELETE',
  });
  assert.equal(deleteLocal.status, 204);
  await assert.rejects(fs.stat(uploadPath));

  const finalStories = await fetch(`${baseUrl}/api/stories`);
  const finalData = await finalStories.json();
  assert.equal(finalData[0].referenceDocuments.length, 2);
  if (finalData[0].acceptanceTests.length) {
    assert.ok(finalData[0].acceptanceTests[0].gwtHealth);
  }
});

test('story health recheck endpoint recalculates INVEST warnings', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  const stories = await storiesResponse.json();
  const story = stories[0];

  const patchResponse = await fetch(`${baseUrl}/api/stories/${story.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: story.title,
      description: story.description,
      asA: '',
      iWant: story.iWant,
      soThat: '',
      acceptWarnings: true,
    }),
  });
  assert.equal(patchResponse.status, 200);

  const recheckResponse = await fetch(`${baseUrl}/api/stories/${story.id}/health-check`, {
    method: 'POST',
  });
  assert.equal(recheckResponse.status, 200);
  const refreshed = await recheckResponse.json();
  assert.equal(refreshed.id, story.id);
  assert.ok(refreshed.investHealth);
  assert.equal(refreshed.investHealth.satisfied, false);
  assert.ok(Array.isArray(refreshed.investWarnings));
  assert.ok(
    refreshed.investWarnings.some(
      (warning) => /persona/i.test(warning.message) || /So that/i.test(warning.message)
    )
  );
  assert.ok(refreshed.investAnalysis);
  assert.ok(['heuristic', 'fallback', 'openai'].includes(refreshed.investAnalysis.source));
});

test('ChatGPT analysis drives INVEST outcome when available', async (t) => {
  await resetDatabaseFiles();
  const previousDisable = process.env.AI_PM_DISABLE_OPENAI;
  const previousKey = process.env.AI_PM_OPENAI_API_KEY;
  process.env.AI_PM_DISABLE_OPENAI = '0';
  process.env.AI_PM_OPENAI_API_KEY = 'test-key';

  const originalFetch = global.fetch;
  const { Response } = globalThis;
  const aiPayload = {
    choices: [
      {
        message: {
          content: JSON.stringify({ summary: 'Story looks ready for delivery.', warnings: [] }),
        },
      },
    ],
  };

  global.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || input?.href;
    if (url && /chat\/completions/.test(url)) {
      return new Response(JSON.stringify(aiPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };

  const { server, port } = await startServer();

  t.after(async () => {
    if (previousDisable === undefined) {
      delete process.env.AI_PM_DISABLE_OPENAI;
    } else {
      process.env.AI_PM_DISABLE_OPENAI = previousDisable;
    }
    if (previousKey) {
      process.env.AI_PM_OPENAI_API_KEY = previousKey;
    } else {
      delete process.env.AI_PM_OPENAI_API_KEY;
    }
    global.fetch = originalFetch;
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const createResponse = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'AI validated story',
      asA: 'Platform admin',
      iWant: 'configure rollout windows',
      soThat: 'deployments avoid peak hours',
      description: 'Story without acceptance tests to trigger heuristic guidance',
    }),
  });

  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.investAnalysis.source, 'openai');
  assert.equal(created.investHealth.satisfied, true);
  assert.ok(Array.isArray(created.investAnalysis.fallbackWarnings));
  assert.ok(
    created.investAnalysis.fallbackWarnings.some((issue) =>
      /acceptance test/i.test(issue.message)
    )
  );
  assert.equal(created.investHealth.issues.length, 0);
});

test('baseline INVEST heuristics flag dependency, negotiable, estimable, and sizing issues', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const warningPayload = {
    title: 'Blocked by analytics overhaul',
    asA: 'Platform PM',
    iWant:
      'deliver a pixel-perfect analytics dashboard that must use Library Y and depends on Story XYZ',
    soThat: 'leadership can review metrics quickly',
    description:
      'Blocked by story 123 and requires story ABC to complete. UI must use library Y with exact 24px spacing; scope spans multiple teams and needs discovery for an unknown API.',
    storyPoint: 13,
  };

  const warningResponse = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(warningPayload),
  });

  assert.equal(warningResponse.status, 409);
  const warningBody = await warningResponse.json();
  assert.equal(warningBody.code, 'INVEST_WARNINGS');
  assert.ok(Array.isArray(warningBody.warnings));

  const independentIssue = warningBody.warnings.find((issue) => issue.criterion === 'independent');
  assert.ok(independentIssue, 'independent warning expected');
  assert.match(independentIssue.details, /Independent/);

  const negotiableIssue = warningBody.warnings.find((issue) => issue.criterion === 'negotiable');
  assert.ok(negotiableIssue, 'negotiable warning expected');
  assert.match(negotiableIssue.details, /Negotiable/);

  const estimableIssue = warningBody.warnings.find((issue) => issue.criterion === 'estimable');
  assert.ok(estimableIssue, 'estimable warning expected');
  assert.match(estimableIssue.details, /Estimable/);

  const smallIssue = warningBody.warnings.find((issue) => issue.criterion === 'small');
  assert.ok(smallIssue, 'small warning expected');
  assert.match(smallIssue.details, /Small/);

  const testableIssue = warningBody.warnings.find((issue) => issue.criterion === 'testable');
  assert.ok(testableIssue, 'testable warning expected');
  assert.match(testableIssue.details, /Testable/);

  const okResponse = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...warningPayload, acceptWarnings: true }),
  });

  assert.equal(okResponse.status, 201);
  const created = await okResponse.json();
  assert.ok(Array.isArray(created.investHealth.issues));
  assert.ok(created.investHealth.issues.some((issue) => issue.criterion === 'independent'));
});

test('acceptance tests can be created when legacy title column exists', async (t) => {
  await resetDatabaseFiles();
  await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
  const db = await openDatabase(DATABASE_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE user_stories (
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
      updated_at TEXT NOT NULL
    );
    CREATE TABLE acceptance_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      given TEXT NOT NULL,
      when_step TEXT NOT NULL,
      then_step TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE reference_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  db.close();

  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(stories.length > 0);
  const story = stories[0];

  const createResponse = await fetch(`${baseUrl}/api/stories/${story.id}/tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      given: ['a signed-in customer'],
      when: ['they reset their MFA device'],
      then: ['recovery completes within 30 seconds'],
    }),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.deepEqual(created.given, ['a signed-in customer']);
  assert.ok(Object.prototype.hasOwnProperty.call(created, 'title'));
  assert.ok(String(created.title || '').length > 0);
});

test('JSON fallback driver seeds and serves data when forced', async (t) => {
  await resetDatabaseFiles();
  resetDatabaseFactory();
  process.env.AI_PM_FORCE_JSON_DB = '1';

  const { server, port } = await startServer();

  t.after(async () => {
    delete process.env.AI_PM_FORCE_JSON_DB;
    resetDatabaseFactory();
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(Array.isArray(stories));
  assert.ok(stories.length > 0);
  const fileInfo = await fs.readFile(`${DATABASE_PATH}.json`, 'utf8');
  const parsed = JSON.parse(fileInfo);
  assert.equal(parsed.driver, 'json-fallback');
});
