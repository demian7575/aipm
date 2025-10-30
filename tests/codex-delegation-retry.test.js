import test from 'node:test';
import assert from 'node:assert/strict';

import { delegateImplementationToCodex } from '../apps/backend/app.js';

const ORIGINAL_FETCH = globalThis.fetch;

function createResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('delegateImplementationToCodex returns normalized Codex task data', async (t) => {
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return createResponse(200, {
      taskUrl: 'https://example.com/codex-tasks/42',
      taskId: 42,
      status: 'queued',
      branchName: 'codex/story-7',
      message: 'Codex task created.',
      metadata: { requestId: 'abc-123', task: { id: 42, url: 'https://example.com/codex-tasks/42' } },
    });
  };

  t.after(() => {
    if (ORIGINAL_FETCH) {
      globalThis.fetch = ORIGINAL_FETCH;
    }
  });

  const story = { id: 7, title: 'Retry story', status: 'Draft' };
  const result = await delegateImplementationToCodex(story, {
    endpoint: 'http://127.0.0.1:5005/delegate',
    token: 'example-token',
    repositoryUrl: 'https://github.com/example/repo.git',
    prTitle: 'Generate Codex task',
    prBody: 'Body',
    prTitleTemplate: 'Generate Codex task',
    prBodyTemplate: 'Body template',
    branchName: 'feature/test',
    projectUrl: '',
  });

  assert.equal(calls.length, 1, 'expected a single delegation request');
  assert.equal(
    calls[0].options.headers.Authorization,
    'Bearer example-token',
    'delegation request should forward provided token'
  );

  assert.equal(result.taskUrl, 'https://example.com/codex-tasks/42');
  assert.equal(result.taskId, 42);
  assert.equal(result.status, 'queued');
});
