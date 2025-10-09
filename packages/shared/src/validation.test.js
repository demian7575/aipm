import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectAmbiguity,
  enforceInvestPolicy,
  requireMeasurable,
  rollupStatus,
  validateStoryInvest,
  ValidationPolicies
} from './validation.js';

const baseStory = (overrides = {}) => ({
  id: '11111111-1111-1111-1111-111111111111',
  mrId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  parentId: null,
  order: 0,
  depth: 0,
  title: 'Enable weekly analytics export',
  asA: 'As a product manager',
  iWant: 'I want to export weekly analytics as CSV',
  soThat: 'So that I can share 95% accurate updates with stakeholders',
  invest: {
    independent: true,
    negotiable: true,
    valuable: true,
    estimable: true,
    small: true,
    testable: true
  },
  childrenIds: [],
  testIds: ['22222222-2222-2222-2222-222222222222'],
  status: 'Ready',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  version: 1,
  ...overrides
});

const baseTest = (overrides = {}) => ({
  id: '22222222-2222-2222-2222-222222222222',
  storyId: '11111111-1111-1111-1111-111111111111',
  given: ['Given the analytics job is scheduled'],
  when: ['When the timer runs at midnight UTC'],
  then: ['Then export completes within 5 minutes for 10k rows'],
  ambiguityFlags: [],
  status: 'Pass',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  version: 1,
  ...overrides
});

test('detectAmbiguity identifies ambiguous phrases', () => {
  const result = detectAmbiguity(['시스템은 빠르게 응답한다', 'The job finishes asap.']);
  assert.equal(result.hasIssues, true);
  assert.deepEqual(
    result.issues.map((issue) => issue.term),
    ['빠르게', 'asap']
  );
});

test('requireMeasurable flags non-measurable statements', () => {
  const result = requireMeasurable(['Then the report is generated quickly']);
  assert.equal(result.ok, false);
  assert.equal(result.offending.length, 1);
  const issue = result.offending[0];
  assert.equal(issue.reason, 'missingQuantifiableOutcome');
  assert.ok(issue.guidance.toLowerCase().includes('numeric'));
  assert.ok(Array.isArray(issue.examples));
  assert.ok(issue.examples.length > 0);
});

test('requireMeasurable accepts measurable statements', () => {
  const result = requireMeasurable(['Then results return within 800 ms']);
  assert.equal(result.ok, true);
});

test('validateStoryInvest approves well-formed stories', () => {
  const story = baseStory();
  const testCase = baseTest();

  const result = validateStoryInvest(story, {
    stories: [story],
    tests: [testCase]
  });

  assert.equal(result.ok, true);
  Object.values(result.principles).forEach((principle) => {
    assert.equal(principle.ok, true);
  });
});

test('enforceInvestPolicy blocks saves when strict policy fails', () => {
  const story = baseStory({
    id: '33333333-3333-3333-3333-333333333333',
    testIds: []
  });

  const policyResult = enforceInvestPolicy(story, {
    stories: [story],
    tests: [],
    config: {
      invest: {
        policy: ValidationPolicies.BLOCK,
        smallChildrenThreshold: 5,
        smallDayThreshold: 2
      }
    }
  });

  assert.equal(policyResult.policy, ValidationPolicies.BLOCK);
  assert.equal(policyResult.canSave, false);
  assert.equal(policyResult.principles.testable.ok, false);
});

test('enforceInvestPolicy allows saves when policy warns only', () => {
  const story = baseStory({
    soThat: 'So that decisions are made quickly'
  });

  const result = enforceInvestPolicy(story, {
    stories: [story],
    tests: [],
    config: {
      invest: {
        policy: ValidationPolicies.WARN,
        smallChildrenThreshold: 5,
        smallDayThreshold: 2
      }
    }
  });

  assert.equal(result.policy, ValidationPolicies.WARN);
  assert.equal(result.canSave, true);
  assert.equal(result.ok, false);
});

test('rollupStatus approves parent only when descendants pass', () => {
  const mergeRequest = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'MR:XXXX',
    summary: 'Seed merge request',
    status: 'Ready',
    branch: 'feature/mr-xxxx',
    drift: false,
    lastSyncAt: '2024-01-01T00:00:00.000Z',
    storyIds: [
      '11111111-1111-1111-1111-111111111111',
      '44444444-4444-4444-4444-444444444444'
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1
  };

  const rootStory = baseStory();
  const childStory = baseStory({
    id: '44444444-4444-4444-4444-444444444444',
    parentId: rootStory.id,
    depth: 1,
    order: 1,
    title: 'Track export success rate',
    testIds: ['55555555-5555-5555-5555-555555555555']
  });

  const rootTest = baseTest();
  const childTest = baseTest({
    id: '55555555-5555-5555-5555-555555555555',
    storyId: childStory.id,
    then: ['Then success is above 99% for 500 requests daily'],
    status: 'Pass'
  });

  const result = rollupStatus(mergeRequest, [rootStory, childStory], [rootTest, childTest]);
  assert.ok(result.approvedStoryIds.includes(rootStory.id));
  assert.ok(result.approvedStoryIds.includes(childStory.id));

  const failingChildTest = { ...childTest, status: 'Fail' };
  const failedResult = rollupStatus(mergeRequest, [rootStory, childStory], [rootTest, failingChildTest]);
  assert.ok(!failedResult.approvedStoryIds.includes(rootStory.id));
  assert.ok(!failedResult.approvedStoryIds.includes(childStory.id));
});
