import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REPO_API_URL,
  createDefaultCodexForm,
  validateCodexInput,
} from '../apps/frontend/public/codex.js';

test('validateCodexInput flags missing required fields', () => {
  const defaults = createDefaultCodexForm({ id: 1, title: 'Story' });
  const result = validateCodexInput({
    ...defaults,
    repositoryApiUrl: '',
    owner: '',
    repo: '',
    branchName: '',
    taskTitle: '',
    objective: '',
    prTitle: '',
    constraints: '',
    acceptanceCriteria: '',
    target: 'new-issue',
    targetNumber: '',
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.repositoryApiUrl);
  assert.ok(result.errors.owner);
  assert.ok(result.errors.repo);
  assert.ok(result.errors.branchName);
  assert.ok(result.errors.taskTitle);
  assert.ok(result.errors.objective);
  assert.ok(result.errors.prTitle);
  assert.ok(result.errors.constraints);
  assert.ok(result.errors.acceptanceCriteria);
});

test('validateCodexInput accepts new issue payload with defaults', () => {
  const values = {
    repositoryApiUrl: DEFAULT_REPO_API_URL,
    owner: 'demian7575',
    repo: 'aipm',
    branchName: 'aipm/codex/1-sample',
    taskTitle: 'AIPM: 1 Sample — Delegate to Codex',
    objective: 'Enable the end user to Sample.',
    prTitle: 'AIPM: Sample',
    constraints: 'TypeScript only',
    acceptanceCriteria: 'Acceptable\nValid',
    target: 'new-issue',
    targetNumber: '',
  };

  const result = validateCodexInput(values);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('validateCodexInput requires a numeric identifier for existing issues', () => {
  const base = {
    repositoryApiUrl: DEFAULT_REPO_API_URL,
    owner: 'demian7575',
    repo: 'aipm',
    branchName: 'aipm/codex/1-sample',
    taskTitle: 'AIPM: 1 Sample — Delegate to Codex',
    objective: 'Enable the end user to Sample.',
    prTitle: 'AIPM: Sample',
    constraints: 'TypeScript only',
    acceptanceCriteria: 'Acceptable',
  };

  const missingNumber = validateCodexInput({ ...base, target: 'issue', targetNumber: '' });
  assert.equal(missingNumber.valid, false);
  assert.ok(missingNumber.errors.targetNumber);

  const validNumber = validateCodexInput({ ...base, target: 'issue', targetNumber: '42' });
  assert.equal(validNumber.valid, true);
  assert.deepEqual(validNumber.errors, {});
});
