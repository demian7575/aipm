import { GuidanceCheck, GuidanceReport } from './types';
import { deriveLevel, hasConjunctionChain, hasVagueLanguage } from './helpers';

export interface StoryDraft {
  asA: string;
  iWant: string;
  soThat: string;
  notes?: string;
}

export function evaluateStoryDraft(draft: StoryDraft): GuidanceReport {
  const checks: GuidanceCheck[] = [];

  const asA = draft.asA.trim();
  const iWant = draft.iWant.trim();
  const soThat = draft.soThat.trim();

  if (!asA) {
    checks.push({
      id: 'format-as-a',
      label: 'As a statement',
      level: 'fail',
      message: 'Describe who benefits: start with “As a …”.'
    });
  } else if (!/^as a\b/i.test(asA)) {
    checks.push({
      id: 'format-as-a-prefix',
      label: 'As a statement prefix',
      level: 'warn',
      message: 'Begin with “As a …” to keep the template consistent.'
    });
  } else {
    checks.push({
      id: 'format-as-a-pass',
      label: 'As a statement clarity',
      level: 'pass',
      message: 'Persona captured.'
    });
  }

  if (!iWant) {
    checks.push({
      id: 'format-i-want',
      label: 'I want statement',
      level: 'fail',
      message: 'Explain the capability with “I want …”.'
    });
  } else {
    if (!/^i want\b/i.test(iWant)) {
      checks.push({
        id: 'format-i-want-prefix',
        label: 'I want statement prefix',
        level: 'warn',
        message: 'Begin with “I want …”.'
      });
    }
    if (hasConjunctionChain(iWant)) {
      checks.push({
        id: 'invest-independent',
        label: 'Independent',
        level: 'warn',
        message: 'Break multiple objectives into separate stories to stay independent.'
      });
    } else {
      checks.push({
        id: 'invest-independent-pass',
        label: 'Independent',
        level: 'pass',
        message: 'Single focused outcome.'
      });
    }

    if (iWant.length > 160) {
      checks.push({
        id: 'invest-small',
        label: 'Small',
        level: 'warn',
        message: 'Trim to a concise scope (under ~160 characters) to stay small.'
      });
    } else {
      checks.push({
        id: 'invest-small-pass',
        label: 'Small',
        level: 'pass',
        message: 'Scope appears manageable.'
      });
    }
  }

  if (!soThat) {
    checks.push({
      id: 'format-so-that',
      label: 'So that statement',
      level: 'fail',
      message: 'Describe the measurable benefit with “So that …”.'
    });
  } else {
    if (!/^so that\b/i.test(soThat)) {
      checks.push({
        id: 'format-so-that-prefix',
        label: 'So that statement prefix',
        level: 'warn',
        message: 'Begin with “So that …”.'
      });
    }
    if (soThat.length < 30) {
      checks.push({
        id: 'invest-valuable',
        label: 'Valuable',
        level: 'warn',
        message: 'Clarify the user or business value to demonstrate value.'
      });
    } else {
      checks.push({
        id: 'invest-valuable-pass',
        label: 'Valuable',
        level: 'pass',
        message: 'Outcome is articulated.'
      });
    }
  }

  if (hasVagueLanguage(iWant) || hasVagueLanguage(soThat)) {
    checks.push({
      id: 'invest-testable',
      label: 'Testable language',
      level: 'warn',
      message: 'Replace vague adjectives with observable outcomes to stay testable.'
    });
  } else {
    checks.push({
      id: 'invest-testable-pass',
      label: 'Testable language',
      level: 'pass',
      message: 'Statements use concrete terms.'
    });
  }

  const summary = checks.some((check) => check.level === 'fail')
    ? 'Update the story to satisfy the As a / I want / So that structure.'
    : checks.some((check) => check.level === 'warn')
    ? 'Story is close—review INVEST guidance before creating.'
    : 'Story meets INVEST heuristics.';

  return {
    summary,
    level: deriveLevel(checks),
    checks
  };
}
