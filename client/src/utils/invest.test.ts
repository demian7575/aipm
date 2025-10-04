import { describe, expect, it } from 'vitest';
import { evaluateInvest } from './invest';

const goodStory = {
  asA: 'project manager',
  iWant: 'to review the breakdown for a single user story iteration',
  soThat: 'the team can focus on delivering value with clear boundaries',
  given: 'Given a drafted user story with proposed acceptance criteria',
  when: 'When I open the story detail modal and review the INVEST checklist',
  then: 'Then I can confirm the scenario is observable and ready for delivery',
};

describe('evaluateInvest', () => {
  it('approves a well formed story draft', () => {
    const result = evaluateInvest(goodStory);
    expect(result.items.every((item) => item.passed)).toBe(true);
    expect(result.summary).toBe('6/6 INVEST checks satisfied');
  });

  it('flags missing or vague details', () => {
    const result = evaluateInvest({
      asA: '',
      iWant: 'to improve things quickly and easily',
      soThat: 'I must have perfection',
      given: '',
      when: 'When I click around',
      then: 'Then it looks nice',
    });

    const failingItems = result.items.filter((item) => !item.passed).map((item) => item.key);
    expect(failingItems).toContain('independent');
    expect(failingItems).toContain('negotiable');
    expect(failingItems).toContain('estimable');
    expect(failingItems).toContain('testable');
    expect(result.summary).toMatch(/\d\/6 INVEST checks satisfied/);
  });
});
