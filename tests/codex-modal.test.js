import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REPO_API_URL,
  createDefaultCodexForm,
  buildAcceptanceTestFallback,
  buildAcceptanceTestIdea,
  deriveAcceptanceCriteriaDefaults,
  validateCodexInput,
  createLocalDelegationEntry,
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

test('buildAcceptanceTestIdea summarises multiline criteria', () => {
  const idea = buildAcceptanceTestIdea('First criterion\nSecond item');
  assert.equal(idea, 'Acceptance criteria: First criterion; Second item');
});

test('buildAcceptanceTestIdea truncates lengthy summaries', () => {
  const long = 'A'.repeat(1000);
  const idea = buildAcceptanceTestIdea([long]);
  assert.ok(idea.startsWith('Acceptance criterion: '));
  assert.ok(idea.endsWith('…'));
  assert.ok(idea.length <= 480);
});

test('buildAcceptanceTestFallback maps acceptance criteria into then steps', () => {
  const fallback = buildAcceptanceTestFallback(
    {
      id: 7,
      title: 'Improve notifications',
      asA: 'Product manager',
      iWant: 'to review release readiness',
      soThat: 'stakeholders stay informed',
      acceptanceTests: [{ id: 1 }],
    },
    'Send summary email\nShow deployment checklist'
  );

  assert.equal(fallback.status, 'Draft');
  assert.ok(Array.isArray(fallback.given));
  assert.ok(Array.isArray(fallback.when));
  assert.ok(Array.isArray(fallback.then));
  assert.equal(fallback.then[0], 'Then Send summary email');
  assert.equal(fallback.then[1], 'And Show deployment checklist');
  assert.match(fallback.title, /Improve notifications/);
  assert.match(fallback.when[0], /Product manager/i);
});

test('deriveAcceptanceCriteriaDefaults prefers then steps from acceptance tests', () => {
  const criteria = deriveAcceptanceCriteriaDefaults({
    acceptanceTests: [
      { then: ['Then displays report', 'And sends notification.'] },
      { then: ['Then displays report', 'And records metrics'] },
    ],
    asA: 'analyst',
    iWant: 'to view insights',
    soThat: 'decisions improve',
  });

  const lines = criteria.split('\n');
  assert.deepEqual(lines, ['displays report', 'sends notification', 'records metrics']);
});

test('deriveAcceptanceCriteriaDefaults falls back to persona, action, and outcome', () => {
  const criteria = deriveAcceptanceCriteriaDefaults({
    acceptanceTests: [],
    asA: 'sales manager',
    iWant: 'review pipeline',
    soThat: 'forecasts stay accurate.',
  });

  const lines = criteria.split('\n');
  assert.ok(lines[0].includes('sales manager'));
  assert.ok(/reviews|review/i.test(lines[0]));
  assert.ok(lines[1].startsWith('Outcome confirmed:'));
  assert.ok(/forecasts stay accurate/i.test(lines[1]));
});

test('createLocalDelegationEntry captures task and confirmation metadata', () => {
  const story = { id: 42, title: 'Improve analytics' };
  const formValues = {
    owner: 'demian7575',
    repo: 'aipm',
    repositoryApiUrl: DEFAULT_REPO_API_URL,
    branchName: 'aipm/codex/42-improve-analytics',
    taskTitle: 'AIPM: 42 Improve analytics — Delegate to Codex',
    objective: 'Enable better analytics',
    prTitle: 'AIPM: Improve analytics',
    constraints: 'TypeScript only',
    acceptanceCriteria: 'Done',
    target: 'new-issue',
    targetNumber: '',
    createTrackingCard: true,
  };

  const response = {
    number: 101,
    id: 555,
    html_url: 'https://github.com/demian7575/aipm/issues/101',
    taskHtmlUrl: 'https://github.com/demian7575/aipm/issues/101',
    threadHtmlUrl: 'https://github.com/demian7575/aipm/issues/101#comment-12345',
    confirmationCode: 'ABC1234',
  };

  const entry = createLocalDelegationEntry(story, formValues, response);
  assert.equal(entry.taskUrl, 'https://github.com/demian7575/aipm/issues/101');
  assert.equal(entry.threadUrl, 'https://github.com/demian7575/aipm/issues/101#comment-12345');
  assert.equal(entry.confirmationCode, 'ABC1234');
  assert.equal(entry.htmlUrl, 'https://github.com/demian7575/aipm/issues/101#comment-12345');
});
