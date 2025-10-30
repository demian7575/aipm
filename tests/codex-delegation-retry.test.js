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

test('delegateImplementationToCodex retries with embedded token after auth failure', async (t) => {
  const calls = [];
  process.env.AI_PM_CODEX_EMBEDDED_GITHUB_TOKEN = 'github_pat_fallback_token';

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (calls.length === 1) {
      return createResponse(401, {
        message: 'GitHub authentication failed while creating the pull request.',
        code: 'GITHUB_AUTH_FAILED',
        details: { tokenSource: 'authorization-header' },
      });
    }
    return createResponse(200, {
      pullRequestUrl: 'https://example.com/pull/42',
      pullRequestNumber: 42,
      status: 'open',
      branchName: 'feature/fallback',
      message: 'GitHub pull request created.',
      metadata: { tokenSource: 'embedded-env' },
    });
  };

  t.after(() => {
    if (ORIGINAL_FETCH) {
      globalThis.fetch = ORIGINAL_FETCH;
    }
    delete process.env.AI_PM_CODEX_EMBEDDED_GITHUB_TOKEN;
  });

  const story = { id: 7, title: 'Retry story', status: 'Draft' };
  const result = await delegateImplementationToCodex(story, {
    endpoint: 'http://127.0.0.1:5005/delegate',
    token: 'github_pat_invalid_token',
    repositoryUrl: 'https://github.com/example/repo.git',
    prTitle: 'Retry fallback test',
    prBody: 'Body',
    prTitleTemplate: 'Retry fallback test',
    prBodyTemplate: 'Body template',
    branchName: 'feature/test',
    projectUrl: '',
  });

  assert.equal(calls.length, 2, 'expected two delegation attempts');
  assert.equal(
    calls[0].options.headers.Authorization,
    'Bearer github_pat_invalid_token',
    'first attempt should use the provided token'
  );
  assert.equal(
    calls[1].options.headers.Authorization,
    'Bearer github_pat_fallback_token',
    'second attempt should use embedded fallback token'
  );

  assert.equal(result.pullRequestUrl, 'https://example.com/pull/42');
  assert.equal(result.pullRequestNumber, 42);
  assert.equal(result.status, 'open');
});
