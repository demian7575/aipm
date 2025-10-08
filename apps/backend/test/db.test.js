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

test('db falls back when sqlite json flag is unavailable', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', moduleProbe], {
    cwd: backendRoot,
    env: { ...process.env, SQLITE_JSON_DISABLED: '1' },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  const output = result.stdout.trim();
  assert.ok(output.length > 0, 'should emit JSON output');
  const parsed = JSON.parse(output);
  assert.ok(typeof parsed.count === 'number', 'count should be numeric');
});

test('db initializes storage directory automatically', () => {
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
