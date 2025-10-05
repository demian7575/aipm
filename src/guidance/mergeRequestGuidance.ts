import { GuidanceCheck, GuidanceReport } from './types';
import { deriveLevel, hasVagueLanguage } from './helpers';

export interface MergeRequestDraft {
  title: string;
  summary: string;
}

export function evaluateMergeRequestDraft(draft: MergeRequestDraft): GuidanceReport {
  const checks: GuidanceCheck[] = [];
  const title = draft.title.trim();
  const summary = draft.summary.trim();

  if (!title) {
    checks.push({
      id: 'title',
      label: 'Title present',
      level: 'fail',
      message: 'Provide an MR title that communicates the initiative.'
    });
  } else {
    checks.push({
      id: 'title-pass',
      label: 'Title clarity',
      level: 'pass',
      message: 'Title present.'
    });
  }

  if (!summary) {
    checks.push({
      id: 'summary',
      label: 'Summary detail',
      level: 'fail',
      message: 'Summarize the MR scope so stories can be derived from it.'
    });
  } else {
    if (summary.length < 40) {
      checks.push({
        id: 'summary-length',
        label: 'Summary depth',
        level: 'warn',
        message: 'Add a bit more detail so the team understands the intent.'
      });
    } else {
      checks.push({
        id: 'summary-pass',
        label: 'Summary depth',
        level: 'pass',
        message: 'Summary provides actionable context.'
      });
    }

    if (hasVagueLanguage(summary)) {
      checks.push({
        id: 'summary-clarity',
        label: 'Avoid vague language',
        level: 'warn',
        message: 'Swap generic adjectives for concrete outcomes.'
      });
    }
  }

  const summaryText = checks.some((check) => check.level === 'fail')
    ? 'Complete the MR title and summary before creating it.'
    : checks.some((check) => check.level === 'warn')
    ? 'MR draft is nearly ready—resolve the warnings to improve clarity.'
    : 'MR draft contains enough context to start planning user stories.';

  return {
    summary: summaryText,
    level: deriveLevel(checks),
    checks
  };
}
