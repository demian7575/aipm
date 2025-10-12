import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createApp, DATABASE_PATH } from '../apps/backend/app.js';

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
  await fs.rm(DATABASE_PATH, { force: true });
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

  const finalStories = await fetch(`${baseUrl}/api/stories`);
  const finalData = await finalStories.json();
  assert.equal(finalData[0].referenceDocuments.length, 2);
});
