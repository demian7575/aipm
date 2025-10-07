import { describe, expect, it } from 'vitest';
import {
  analyzeStory,
  analyzeTest,
  detectAmbiguity,
  evaluateInvest,
  measurementUnits
} from '../src/index';

const sampleStory = {
  title: 'As an admin I want to invite users quickly so that onboarding is fast',
  action: 'I want to invite users quickly',
  reason: 'So that collaboration improves',
  role: 'As an admin',
  estimateDays: 1,
  gwt: {
    given: 'Given I am on the workspace page',
    when: 'When I click invite',
    then: 'Then the teammate receives an email in 2 minutes'
  }
};

describe('evaluateInvest', () => {
  it('passes INVEST when thresholds met', () => {
    const result = evaluateInvest(sampleStory, { childCount: 1 });
    expect(result.compliant).toBe(true);
  });

  it('fails when estimate exceeds limit', () => {
    const result = evaluateInvest({ ...sampleStory, estimateDays: 10 }, { maxDays: 2 });
    expect(result.compliant).toBe(false);
    expect(result.issues.some((issue) => issue.includes('Small threshold'))).toBe(true);
  });
});

describe('detectAmbiguity', () => {
  it('flags dictionary words', () => {
    const flags = detectAmbiguity('This should maybe work asap');
    expect(flags.map((f) => f.text)).toContain('should');
  });
});

describe('analyzeStory', () => {
  it('detects missing measurements', () => {
    const story = {
      ...sampleStory,
      gwt: { ...sampleStory.gwt, then: 'Then response returns in 5' }
    };
    const analysis = analyzeStory(story, {});
    expect(analysis.ambiguity.some((flag) => flag.reason === 'missing-measurement')).toBe(true);
  });
});

describe('analyzeTest', () => {
  it('highlights ambiguous steps', () => {
    const analysis = analyzeTest({ title: 'Should be fast', steps: ['Complete flow asap'] });
    expect(analysis.ambiguity.length).toBeGreaterThan(0);
  });
});

describe('measurement units', () => {
  it('includes percentage unit', () => {
    expect(measurementUnits).toContain('%');
  });
});
