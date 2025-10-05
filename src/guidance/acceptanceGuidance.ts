import { GuidanceCheck, GuidanceReport } from './types';
import { deriveLevel, hasVagueLanguage } from './helpers';

export interface AcceptanceDraft {
  title: string;
  given: string;
  when: string;
  then: string;
  notes?: string;
}

const forbiddenPlaceholders = ['tbd', 'todo', 'lorem'];

export function evaluateAcceptanceDraft(draft: AcceptanceDraft): GuidanceReport {
  const checks: GuidanceCheck[] = [];

  const given = draft.given.trim();
  const when = draft.when.trim();
  const then = draft.then.trim();

  if (!draft.title.trim()) {
    checks.push({
      id: 'title',
      label: 'Test title',
      level: 'warn',
      message: 'Provide a short descriptive title for traceability.'
    });
  }

  if (!given) {
    checks.push({
      id: 'given',
      label: 'Given clause',
      level: 'fail',
      message: 'Define the precondition starting with “Given …”.'
    });
  } else if (!/^given\b/i.test(given)) {
    checks.push({
      id: 'given-prefix',
      label: 'Given clause prefix',
      level: 'warn',
      message: 'Prefix the step with “Given …”.'
    });
  } else {
    checks.push({
      id: 'given-pass',
      label: 'Given clause clarity',
      level: 'pass',
      message: 'Precondition captured.'
    });
  }

  if (!when) {
    checks.push({
      id: 'when',
      label: 'When clause',
      level: 'fail',
      message: 'Describe the trigger using “When …”.'
    });
  } else if (!/^when\b/i.test(when)) {
    checks.push({
      id: 'when-prefix',
      label: 'When clause prefix',
      level: 'warn',
      message: 'Prefix the step with “When …”.'
    });
  } else {
    checks.push({
      id: 'when-pass',
      label: 'When clause clarity',
      level: 'pass',
      message: 'Trigger is clear.'
    });
  }

  if (!then) {
    checks.push({
      id: 'then',
      label: 'Then clause',
      level: 'fail',
      message: 'Describe the observable outcome using “Then …”.'
    });
  } else if (!/^then\b/i.test(then)) {
    checks.push({
      id: 'then-prefix',
      label: 'Then clause prefix',
      level: 'warn',
      message: 'Prefix the step with “Then …”.'
    });
  } else {
    checks.push({
      id: 'then-pass',
      label: 'Then clause clarity',
      level: 'pass',
      message: 'Outcome is observable.'
    });
  }

  const combined = `${given} ${when} ${then}`.toLowerCase();
  if (forbiddenPlaceholders.some((token) => combined.includes(token))) {
    checks.push({
      id: 'placeholders',
      label: 'Placeholder text',
      level: 'fail',
      message: 'Remove placeholder text such as TBD/TODO before creating the test.'
    });
  }

  if (hasVagueLanguage(then)) {
    checks.push({
      id: 'testable',
      label: 'Observable outcome',
      level: 'warn',
      message: 'Clarify measurable results so the test remains verifiable.'
    });
  } else {
    checks.push({
      id: 'testable-pass',
      label: 'Observable outcome',
      level: 'pass',
      message: 'Result is verifiable.'
    });
  }

  const summary = checks.some((check) => check.level === 'fail')
    ? 'Address the failing Given/When/Then guidance before attaching the acceptance test.'
    : checks.some((check) => check.level === 'warn')
    ? 'Acceptance test is almost ready—tighten the highlighted warnings.'
    : 'Acceptance test draft satisfies Given/When/Then heuristics.';

  return {
    summary,
    level: deriveLevel(checks),
    checks
  };
}
