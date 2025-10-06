import { describe, expect, it } from 'vitest';
import {
  AcceptanceTestSchema,
  MergeRequestSchema,
  UserStorySchema,
  analyzeStoryAmbiguity,
  detectAmbiguity,
  evaluateInvest,
  defaultInvestConfig,
} from './index';

const baseStory = {
  id: '11111111-1111-4111-8111-111111111111',
  mrId: '22222222-2222-4222-8222-222222222222',
  parentId: null,
  title: 'Asynchronous notifications',
  asA: 'As a user',
  iWant: 'I want to receive alerts quickly',
  soThat: 'So that I can respond before SLA breaches',
  status: 'backlog' as const,
  estimateDays: 1,
  order: 0,
  depth: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('schemas', () => {
  it('validates merge request shape', () => {
    const data = {
      id: '33333333-3333-4333-8333-333333333333',
      title: 'Improve notifications',
      description: 'Adds new notification workflows',
      status: 'open',
      repository: 'ai/pm',
      branch: 'feature/notifications',
      drifted: false,
      lastSyncAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => MergeRequestSchema.parse(data)).not.toThrow();
  });

  it('rejects acceptance test without gwt', () => {
    expect(() =>
      AcceptanceTestSchema.parse({
        id: '00000000-0000-4000-8000-000000000000',
        storyId: baseStory.id,
        title: 'invalid',
        given: 'G',
        when: 'W',
        then: '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).toThrowErrorMatchingInlineSnapshot(`"String must contain at least 3 character(s)"`);
  });
});

describe('invest evaluation', () => {
  it('computes INVEST score', () => {
    const result = evaluateInvest(
      baseStory,
      {
        children: [],
        tests: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            storyId: baseStory.id,
            title: 'Given an alert when threshold is reached',
            given: 'Given an SLA threshold',
            when: 'When metric exceeds 120%',
            then: 'Then notify within 5 minutes',
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      defaultInvestConfig,
    );

    expect(result.summary.score).toBeGreaterThan(3);
    expect(result.testable.satisfied).toBe(true);
  });

  it('flags missing estimate', () => {
    const result = evaluateInvest(
      { ...baseStory, estimateDays: null },
      { children: [], tests: [] },
      defaultInvestConfig,
    );
    expect(result.estimable.satisfied).toBe(false);
    expect(result.testable.satisfied).toBe(false);
  });
});

describe('ambiguity detection', () => {
  it('detects ambiguous english words', () => {
    const result = detectAmbiguity('System should be fast and optimal maybe');
    expect(result.tokens).toContain('should');
    expect(result.tokens).toContain('maybe');
  });

  it('summarizes story ambiguity with tests', () => {
    const summary = analyzeStoryAmbiguity(baseStory, [
      {
        title: 'Given a trigger',
        given: 'Given a user',
        when: 'When they click quickly',
        then: 'Then respond in 3 seconds',
      },
    ]);
    expect(summary.fields['test-0-then'].missingMeasurement).toBe(false);
  });
});

it('validates user story required fields', () => {
  expect(() => UserStorySchema.parse({ ...baseStory, title: 'Okay' })).not.toThrow();
});
