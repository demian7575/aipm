import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { InMemoryStore, store } from '../src/store.js';

test('seedIfEmpty preserves existing SQLite rows', () => {
  store.reset();
  store.seed();
  const [mr] = store.listMergeRequests();
  assert.ok(mr, 'Seed should provide a merge request');

  const initialStories = store.listStories({ mrId: mr.id }).length;
  store.createStory({
    mrId: mr.id,
    title: 'Persistent story',
    asA: 'As a maintainer',
    iWant: 'I want stored data to survive restarts',
    soThat: 'I can trust the planning workspace'
  });

  const afterCreate = store.listStories({ mrId: mr.id }).length;
  assert.equal(afterCreate, initialStories + 1);

  store.seedIfEmpty();
  const afterSeedIfEmpty = store.listStories({ mrId: mr.id }).length;
  assert.equal(afterSeedIfEmpty, afterCreate, 'seedIfEmpty must not discard existing records');

  const freshStore = new InMemoryStore();
  const persistedCount = freshStore.listStories({ mrId: mr.id }).length;
  assert.equal(persistedCount, afterCreate, 'new store instance should load persisted stories');

  store.reset();
});

test.describe('HTTP API', () => {
  let server;
  let baseURL;

  test.before(async () => {
    server = await startServer({ port: 0, forceSeed: true });
    const address = server.address();
    baseURL = `http://127.0.0.1:${address.port}`;
  });

  test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('list merge requests from seed', async () => {
    const response = await fetch(`${baseURL}/api/merge-requests`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 1);
  });

  test('create story under merge request', async () => {
    const [mr] = store.listMergeRequests();
    const payload = {
      mrId: mr.id,
      title: 'Author acceptance tests',
      asA: 'As QA',
      iWant: 'I want to capture GWT scenarios',
      soThat: 'We have measurable coverage'
    };
    const response = await fetch(`${baseURL}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(response.status, 201);
    const story = await response.json();
    assert.equal(story.mrId, mr.id);
    assert.equal(story.title, payload.title);
  });

  test('update branch toggles drift state', async () => {
    const [mr] = store.listMergeRequests();
    const response = await fetch(`${baseURL}/api/merge-requests/${mr.id}/update-branch`, { method: 'POST' });
    assert.equal(response.status, 200);
    const updated = await response.json();
    assert.notEqual(updated.drift, mr.drift);
  });

  test('retrieve story tree', async () => {
    const [mr] = store.listMergeRequests();
    const response = await fetch(`${baseURL}/api/stories/tree?mrId=${mr.id}`);
    assert.equal(response.status, 200);
    const tree = await response.json();
    assert.ok(Array.isArray(tree));
    assert.ok(tree.length >= 1);
    assert.ok(tree[0].children.every((node) => node.story.parentId === tree[0].story.id));
  });

  test('reject acceptance test without required steps', async () => {
    const [mr] = store.listMergeRequests();
    const [story] = store.listStories({ mrId: mr.id });
    const response = await fetch(`${baseURL}/api/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId: story.id,
        given: ['   '],
        when: [''],
        then: ['   ']
      })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, 'test.givenRequired');
  });

  test('prevent updates that clear acceptance test steps', async () => {
    const [mr] = store.listMergeRequests();
    const [story] = store.listStories({ mrId: mr.id });
    const createResponse = await fetch(`${baseURL}/api/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId: story.id,
        given: ['Given a valid test'],
        when: ['When validation runs'],
        then: ['Then metrics are captured within 2 seconds']
      })
    });
    assert.equal(createResponse.status, 201);
    const testPayload = await createResponse.json();

    const updateResponse = await fetch(`${baseURL}/api/tests/${testPayload.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        given: ['   '],
        when: ['When validation still runs'],
        then: ['Then metrics are captured within 2 seconds']
      })
    });
    assert.equal(updateResponse.status, 400);
    const updateBody = await updateResponse.json();
    assert.equal(updateBody.code, 'test.givenRequired');
  });
});
