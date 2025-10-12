import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createNetServer } from 'node:net';
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

test('startServer retries on occupied default port', async () => {
  const blocker = createNetServer();
  await new Promise((resolve, reject) => {
    blocker.once('error', reject);
    blocker.listen(4000, '127.0.0.1', resolve);
  });

  let server;
  try {
    server = await startServer({ seed: false });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    assert.notEqual(address.port, 4000, 'server should shift away from occupied default port');
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
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

  test('allow overriding INVEST warnings on story create', async () => {
    const [mr] = store.listMergeRequests();
    const payload = {
      mrId: mr.id,
      title: 'Huge rewrite initiative',
      asA: 'As a platform engineer',
      iWant: 'I want to rebuild everything at once',
      soThat: 'fast'
    };

    const firstResponse = await fetch(`${baseURL}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(firstResponse.status, 400);
    const firstBody = await firstResponse.json();
    assert.equal(firstBody.code, 'story.invest');
    assert.equal(firstBody.details?.allowOverride, true);

    const retryResponse = await fetch(`${baseURL}/api/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, acceptWarnings: true })
    });

    assert.equal(retryResponse.status, 201);
    const created = await retryResponse.json();
    assert.equal(created.title, payload.title);
    assert.equal(created.soThat, payload.soThat);
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

  test('allow overriding measurability warnings on test create', async () => {
    const [mr] = store.listMergeRequests();
    const [story] = store.listStories({ mrId: mr.id });
    const payload = {
      storyId: story.id,
      given: ['Given a deployment is queued'],
      when: ['When the job finishes'],
      then: ['Then the dashboard looks great']
    };

    const firstResponse = await fetch(`${baseURL}/api/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(firstResponse.status, 400);
    const firstBody = await firstResponse.json();
    assert.equal(firstBody.code, 'test.measurable');
    assert.equal(firstBody.details?.allowOverride, true);

    const retryResponse = await fetch(`${baseURL}/api/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, acceptWarnings: true })
    });

    assert.equal(retryResponse.status, 201);
    const created = await retryResponse.json();
    assert.ok(Array.isArray(created.then));
    assert.equal(created.then[0], payload.then[0]);
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

  test('surface measurability guidance for acceptance tests', async () => {
    const [mr] = store.listMergeRequests();
    const [story] = store.listStories({ mrId: mr.id });
    const response = await fetch(`${baseURL}/api/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId: story.id,
        given: ['Given a user is ready'],
        when: ['When the job finishes'],
        then: ['Then the dashboard looks great']
      })
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, 'test.measurable');
    assert.match(body.message, /measurability failed/i);
    const issues = body.details?.feedback?.issues ?? [];
    assert.ok(Array.isArray(issues));
    assert.ok(issues.length >= 1, 'should include at least one measurability issue');
    const first = issues[0];
    assert.equal(first.index, 0);
    assert.match(first.text, /dashboard looks great/);
    assert.match(first.suggestion.toLowerCase(), /numeric|time|threshold/);
    assert.equal(first.criteria, 'Then step must describe a measurable, verifiable outcome.');
    assert.ok(Array.isArray(first.examples));
    assert.ok(first.examples.length > 0);
    const aggregatedExamples = body.details?.feedback?.examples ?? [];
    assert.ok(Array.isArray(aggregatedExamples));
    assert.ok(aggregatedExamples.length > 0);
  });
});
