import { describe, expect, it } from 'vitest';
import {
  createAcceptanceTest,
  createStory,
  detectAmbiguity,
  requireMeasurable,
  rollupStatus,
  validateAcceptanceTest,
  validateStoryInvest
} from '../src/validation.js';
import type { AcceptanceTest, MergeRequest, UserStory } from '../src/schemas.js';

function buildFixtures() {
  const mr: MergeRequest = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'MR: Seed',
    summary: 'Seed merge request',
    status: 'Draft',
    branch: 'feature/seed',
    drift: true,
    lastSyncAt: new Date().toISOString(),
    storyIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 0
  };
  const root = createStory({
    mrId: mr.id,
    title: 'Independent feature',
    asA: 'As an AI PM',
    iWant: 'I want a dashboard',
    soThat: 'I can view metrics clearly'
  });
  root.testIds = [];
  root.childrenIds = [];
  const test = createAcceptanceTest(root.id);
  test.status = 'Pass';
  test.ambiguityFlags = [];
  mr.storyIds = [root.id];
  return { mr, stories: [root], tests: [test] };
}

describe('validation helpers', () => {
  it('detects ambiguity words in mixed languages', () => {
    const result = detectAmbiguity(['빠르게 처리한다', 'complete optimally']);
    expect(result).toContain('빠르게');
    expect(result).toContain('optimal');
  });

  it('requires measurable statements', () => {
    const result = requireMeasurable(['responds within 5 seconds', 'handles 100 users']);
    expect(result.ok).toBe(true);
  });

  it('validates acceptance tests for ambiguity and measurability', () => {
    const result = validateAcceptanceTest({
      given: ['a context exists'],
      when: ['an action occurs'],
      then: ['response within 20 ms', 'handles 15 users']
    });
    expect(result.ambiguityFlags.length).toBe(0);
    expect(result.measurability.ok).toBe(true);
  });

  it('rolls up status when children and tests pass', () => {
    const { mr, stories, tests } = buildFixtures();
    stories[0].status = 'Ready';
    const rollup = rollupStatus(mr, stories, tests);
    expect(rollup[0].status).toBe('Approved');
  });

  it('validates INVEST heuristics with warnings', () => {
    const { stories } = buildFixtures();
    const story = stories[0];
    const result = validateStoryInvest(story, { tests: [], children: [] });
    expect(result.checklist.testable).toBe(false);
    expect(result.messages[0].code).toBe('invest.testable');
  });
});
