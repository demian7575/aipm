import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTaskBrief,
  createDelegationServer,
  performDelegation,
} from '../server.js';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_TOKEN = process.env.GITHUB_TOKEN;
const ResponseCtor = global.Response;

function createJsonResponse(body, status = 200) {
  return new ResponseCtor(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('buildTaskBrief renders required sections', () => {
  const brief = buildTaskBrief({
    storyId: 1,
    storyTitle: 'Sample Story',
    branchName: 'feature/sample',
    prTitle: 'AIPM: Sample Story',
    objective: 'Deliver the sample story',
    constraints: 'TypeScript only',
    acceptanceCriteria: ['First', 'Second'],
    owner: 'demian7575',
    repo: 'aipm',
  });

  assert.match(brief, /^@codex/m);
  assert.match(brief, /## Objective/m);
  assert.match(brief, /## Deliverables/m);
  assert.match(brief, /## Acceptance Criteria\n- First\n- Second/m);
  assert.match(brief, /Owner\/Repo: demian7575\/aipm/m);
});

test('performDelegation posts to GitHub issues when creating new tasks', async (t) => {
  process.env.GITHUB_TOKEN = 'test-token';
  const requests = [];
  global.fetch = async (input, init = {}) => {
    const target = typeof input === 'string' ? input : input?.href || '';
    requests.push({ input, init });
    if (target.includes('/issues')) {
      return createJsonResponse({ id: 123, html_url: 'https://github.com/issue/1', number: 77 }, 201);
    }
    return createJsonResponse({}, 200);
  };

  const result = await performDelegation({
    repositoryApiUrl: 'https://api.github.com/repos/demian7575/aipm',
    owner: 'demian7575',
    repo: 'aipm',
    target: 'new-issue',
    branchName: 'feature/sample',
    taskTitle: 'Sample Task',
    objective: 'Do the thing',
    prTitle: 'AIPM: Sample Task',
    constraints: 'Keep tests green',
    acceptanceCriteria: ['Done'],
  });

  assert.equal(result.type, 'issue');
  assert.equal(result.number, 77);
  assert.equal(requests.length, 1);
  const firstUrl =
    typeof requests[0].input === 'string' ? requests[0].input : requests[0].input?.href || '';
  assert.ok(firstUrl.includes('/repos/demian7575/aipm/issues'));

  t.after(() => {
    process.env.GITHUB_TOKEN = ORIGINAL_TOKEN;
    global.fetch = ORIGINAL_FETCH;
  });
});

test('delegation server endpoints respond with mocked GitHub data', async (t) => {
  process.env.GITHUB_TOKEN = 'test-token';
  const responses = {
    issues: createJsonResponse({ id: 1, html_url: 'https://github.com/issue/2', number: 99 }, 201),
    comments: createJsonResponse([
      {
        id: 400,
        body: 'Codex update https://example.com',
        html_url: 'https://github.com/comment/400',
        created_at: '2024-01-01T00:00:00Z',
        user: { login: 'codex-ai' },
      },
    ]),
  };

  global.fetch = async (input, init = {}) => {
    const target = typeof input === 'string' ? input : input?.href || '';
    if (target.includes('/issues/99/comments')) {
      return responses.comments;
    }
    if (target.includes('/issues')) {
      return responses.issues;
    }
    return ORIGINAL_FETCH(input, init);
  };

  const server = createDelegationServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  const postResponse = await ORIGINAL_FETCH(`http://127.0.0.1:${port}/personal-delegate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repositoryApiUrl: 'https://api.github.com/repos/demian7575/aipm',
      owner: 'demian7575',
      repo: 'aipm',
      target: 'new-issue',
      branchName: 'feature/sample',
      taskTitle: 'Sample Task',
      objective: 'Do the thing',
      prTitle: 'AIPM: Sample Task',
      constraints: 'Keep tests green',
      acceptanceCriteria: ['Done'],
    }),
  });
  assert.equal(postResponse.status, 201);
  const postBody = await postResponse.json();
  assert.equal(postBody.number, 99);

  const statusResponse = await ORIGINAL_FETCH(
    `http://127.0.0.1:${port}/personal-delegate/status?owner=demian7575&repo=aipm&number=99`
  );
  assert.equal(statusResponse.status, 200);
  const statusBody = await statusResponse.json();
  assert.equal(statusBody.latestComment.id, 400);
  assert.ok(statusBody.latestComment.links.includes('https://example.com'));

  t.after(async () => {
    process.env.GITHUB_TOKEN = ORIGINAL_TOKEN;
    global.fetch = ORIGINAL_FETCH;
    await new Promise((resolve) => server.close(resolve));
  });
});
