import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createApp, DATABASE_PATH, openDatabase, resetDatabaseFactory } from '../apps/backend/app.js';

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
  assert.equal(story.investHealth.satisfied, false);
  assert.ok(
    story.investHealth.issues.some((issue) =>
      /acceptance tests reach Pass status/i.test(issue.message)
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
