import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { store } from '../src/store.js';

let server;
let baseURL;

test.before(async () => {
  server = await startServer(0);
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
