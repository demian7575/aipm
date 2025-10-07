import { describe, expect, it } from 'vitest';
import {
  UserStorySchema,
  checkInvest,
  detectAmbiguity,
  hasMeasurableValue,
  validateStoryNarrative
} from '../src/index';

describe('UserStorySchema', () => {
  it('validates a proper story', () => {
    const result = UserStorySchema.safeParse({
      id: 's1',
      mrId: 'mr1',
      parentId: null,
      title: 'As an admin I want to invite teammates',
      role: 'As an admin',
      action: 'I want to invite teammates',
      reason: 'So that we can collaborate',
      gwt: {
        given: 'Given I am on the team page',
        when: 'When I click invite',
        then: 'Then users receive an email within 5 minutes'
      },
      estimateDays: 1,
      status: 'draft',
      depth: 0,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(result.success).toBe(true);
  });
});

describe('checkInvest', () => {
  it('flags large estimates', () => {
    const { passed, issues } = checkInvest({ title: 'Test', estimateDays: 4 });
    expect(passed).toBe(false);
    expect(issues.some((issue) => issue.includes('Estimate'))).toBe(true);
  });
});

describe('ambiguity', () => {
  it('detects ambiguous language', () => {
    expect(detectAmbiguity('We should maybe do this fast')).toContain('should');
  });

  it('checks measurability', () => {
    expect(hasMeasurableValue('respond within 5 seconds')).toBe(true);
    expect(hasMeasurableValue('respond quickly')).toBe(false);
  });
});

describe('validateStoryNarrative', () => {
  it('aggregates validation feedback', () => {
    const result = validateStoryNarrative({
      title: 'Improve performance',
      role: 'As a user',
      action: 'I want the app to be fast',
      reason: 'So that I am happy',
      gwt: {
        given: 'Given the app is slow',
        when: 'When we optimize maybe later',
        then: 'Then it should be optimal'
      }
    });

    expect(result.invest.passed).toBe(false);
    expect(result.ambiguities.length).toBeGreaterThan(0);
    expect(result.measurable.length).toBeGreaterThan(0);
  });
});
