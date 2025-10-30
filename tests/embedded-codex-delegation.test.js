import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureEmbeddedCodexDelegationServer } from '../apps/backend/codex-delegation-server.js';

const TEST_PORT = 5555;
const TEST_HOST = '127.0.0.1';

async function startServerOnce() {
  const result = await ensureEmbeddedCodexDelegationServer({
    host: TEST_HOST,
    port: TEST_PORT,
  });
  if (result.disabled) {
    throw new Error('Embedded Codex delegation server unexpectedly disabled during test');
  }
  return result;
}

test('embedded delegation server accepts basic delegation requests', async (t) => {
  const { server } = await startServerOnce();
  t.after(() => {
    if (server && typeof server.close === 'function') {
      server.close();
    }
  });

  const response = await fetch(`http://${TEST_HOST}:${TEST_PORT}/delegate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repositoryUrl: 'https://example.com/demo.git',
      prTitle: 'Codex smoke test',
      prBody: 'Ensure the embedded server handles payloads.',
    }),
  });

  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.equal(payload.status, 'queued');
  assert.equal(payload.taskUrl.includes('/codex-tasks/'), true);
  assert.equal(payload.metadata.repositoryUrl, 'https://example.com/demo.git');
  assert.equal(payload.message, 'Codex task created.');
});
