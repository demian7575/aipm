import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const backendRoot = resolve(__dirname, '..');

const moduleProbe = `
import { store } from './src/store.js';
const count = store.listMergeRequests().length;
console.log(JSON.stringify({ count }));
`;

test('database initializes storage directory automatically', () => {
  const rmResult = spawnSync('rm', ['-rf', 'data'], { cwd: backendRoot });
  assert.equal(rmResult.status, 0, rmResult.stderr?.toString() ?? '');
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', moduleProbe], {
    cwd: backendRoot,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout.trim());
  assert.ok(parsed.count >= 0, 'should provide merge request count');
});

test('database persists records', () => {
  const resetResult = spawnSync('rm', ['-f', 'data/app.sqlite'], { cwd: backendRoot });
  assert.equal(resetResult.status, 0, resetResult.stderr?.toString() ?? '');
  const createScript = `
import { store } from './src/store.js';
const mr = store.createMergeRequest({
  title: 'Persistence smoke',
  summary: 'ensure sqlite persistence works',
  branch: 'feature/sqlite',
  status: 'Draft'
});
console.log(mr.id);
`;
  const createResult = spawnSync(process.execPath, ['--input-type=module', '-e', createScript], {
    cwd: backendRoot,
    encoding: 'utf8'
  });
  assert.equal(createResult.status, 0, createResult.stderr);
  const createdId = createResult.stdout.trim();
  assert.ok(createdId.length > 0, 'should emit merge request id');
  const reloadResult = spawnSync(process.execPath, ['--input-type=module', '-e', moduleProbe], {
    cwd: backendRoot,
    encoding: 'utf8'
  });
  assert.equal(reloadResult.status, 0, reloadResult.stderr);
  const parsed = JSON.parse(reloadResult.stdout.trim());
  assert.ok(parsed.count > 0, 'should retain at least one merge request');
});

test('falls back to sqlite3 CLI when requested', () => {
  const resetResult = spawnSync('rm', ['-f', 'data/app.sqlite'], { cwd: backendRoot });
  assert.equal(resetResult.status, 0, resetResult.stderr?.toString() ?? '');

  const script = `
import { store } from './src/store.js';
const before = store.listMergeRequests().length;
store.createMergeRequest({
  title: 'CLI fallback MR',
  summary: 'ensure CLI fallback writes data',
  branch: 'cli/fallback'
});
const after = store.listMergeRequests().length;
console.log(JSON.stringify({ before, after }));
`;

  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    {
      cwd: backendRoot,
      encoding: 'utf8',
      env: { ...process.env, AI_PM_FORCE_SQLITE_CLI: '1' }
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout.trim());
  assert.ok(payload.after > payload.before, 'CLI fallback should allow creating merge requests');
});
