export const DEFAULT_REPO_API_URL = 'https://api.github.com/repos/demian7575/aipm';

function kebabCase(text) {
  if (!text) {
    return '';
  }
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function computeBranchName(story) {
  if (!story || story.id == null) {
    return 'aipm/codex/branch';
  }
  const safeId = String(story.id).replace(/[^a-z0-9-]+/gi, '');
  const title = kebabCase(story.title || 'story');
  const suffix = title ? `-${title}` : '';
  const combined = `aipm/codex/${safeId}${suffix}`;
  return combined.length > 80 ? combined.slice(0, 80) : combined;
}

export function computeTaskTitle(story) {
  if (!story) {
    return 'AIPM: Delegate to Codex';
  }
  return `AIPM: ${story.id ?? ''} ${story.title ?? ''}`.trim() + ' — Delegate to Codex';
}

export function computeObjective(story) {
  if (!story) {
    return 'Deliver the referenced user story with Codex support.';
  }
  const subject = story.asA ? `${story.asA} user` : 'end user';
  const want = story.iWant || story.title;
  if (want) {
    return `Enable the ${subject} to ${want}.`;
  }
  return `Deliver "${story.title}" with Codex support.`;
}

export function computePrTitle(story) {
  if (!story) {
    return 'AIPM: Delegate to Codex';
  }
  return `AIPM: ${story.title ?? 'Story Implementation'}`;
}

export function deriveAcceptanceCriteriaDefaults(story) {
  if (!story) {
    return '';
  }

  const acceptanceTests = Array.isArray(story.acceptanceTests)
    ? story.acceptanceTests
    : [];

  const thenLines = acceptanceTests
    .flatMap((test) => (Array.isArray(test?.then) ? test.then : []))
    .map((line) => String(line || '').trim())
    .map((line) => line.replace(/^(?:then|and)\s+/i, ''))
    .map((line) => line.replace(/\.$/, ''))
    .filter((line) => line.length > 0);

  const uniqueThenLines = [];
  const seen = new Set();
  thenLines.forEach((line) => {
    const normalized = line.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueThenLines.push(line);
    }
  });

  if (uniqueThenLines.length > 0) {
    return uniqueThenLines.join('\n');
  }

  const persona = describePersona(story.asA);
  const actionSource = story.iWant || story.title || '';
  const action = normalizeActionPhrase(actionSource);
  const outcome = normalizeOutcomePhrase(story.soThat);

  const fallbackLines = [];
  if (action) {
    fallbackLines.push(`${persona} ${action}`);
  }
  if (outcome) {
    fallbackLines.push(`Outcome confirmed: ${outcome}`);
  }

  return fallbackLines.join('\n');
}

export function createDefaultCodexForm(story) {
  return {
    repositoryApiUrl: DEFAULT_REPO_API_URL,
    owner: 'demian7575',
    repo: 'aipm',
    target: 'new-issue',
    targetNumber: '',
    branchName: computeBranchName(story),
    taskTitle: computeTaskTitle(story),
    objective: computeObjective(story),
    prTitle: computePrTitle(story),
    constraints: 'TypeScript, unit tests, no UI regressions',
    acceptanceCriteria: deriveAcceptanceCriteriaDefaults(story),
    createTrackingCard: true,
  };
}

function validateBranchName(value) {
  const text = String(value || '').trim();
  if (!text) {
    return 'Branch name is required.';
  }
  if (/\s/.test(text)) {
    return 'Branch name cannot contain spaces.';
  }
  if (/[^A-Za-z0-9._\/-]/.test(text)) {
    return 'Branch name may only contain letters, numbers, dot, underscore, forward slash, or dash.';
  }
  return '';
}

function validateTargetNumber(target, value) {
  if (target === 'new-issue') {
    return '';
  }
  const text = String(value || '').trim();
  if (!text) {
    return 'Issue or PR number is required.';
  }
  if (!/^\d+$/.test(text)) {
    return 'Number must be numeric.';
  }
  return '';
}

export function validateCodexInput(values) {
  const errors = {};
  const repoUrl = String(values.repositoryApiUrl || '').trim();
  if (!repoUrl) {
    errors.repositoryApiUrl = 'Repository API URL is required.';
  } else if (!repoUrl.startsWith('https://api.github.com/repos/')) {
    errors.repositoryApiUrl = 'Repository API URL must point to the GitHub repos API.';
  }

  if (!String(values.owner || '').trim()) {
    errors.owner = 'Owner is required.';
  }
  if (!String(values.repo || '').trim()) {
    errors.repo = 'Repository name is required.';
  }

  const branchError = validateBranchName(values.branchName);
  if (branchError) {
    errors.branchName = branchError;
  }

  if (!String(values.taskTitle || '').trim()) {
    errors.taskTitle = 'Task title is required.';
  }

  if (!String(values.objective || '').trim()) {
    errors.objective = 'Objective is required.';
  }

  if (!String(values.prTitle || '').trim()) {
    errors.prTitle = 'PR title is required.';
  }

  if (!String(values.constraints || '').trim()) {
    errors.constraints = 'Constraints are required.';
  }

  if (!String(values.acceptanceCriteria || '').trim()) {
    errors.acceptanceCriteria = 'Acceptance criteria are required.';
  }

  const targetError = validateTargetNumber(values.target, values.targetNumber);
  if (targetError) {
    errors.targetNumber = targetError;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeAcceptanceCriteria(text) {
  if (text == null) {
    return [];
  }
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function buildAcceptanceTestIdea(input) {
  const criteria = normalizeAcceptanceCriteria(input);
  if (criteria.length === 0) {
    return '';
  }
  const prefix = criteria.length === 1 ? 'Acceptance criterion: ' : 'Acceptance criteria: ';
  const idea = `${prefix}${criteria.join('; ')}`;
  const limit = 480;
  return idea.length > limit ? `${idea.slice(0, limit - 1)}…` : idea;
}

function describePersona(persona) {
  const text = String(persona || '').trim();
  if (!text) {
    return 'the user';
  }
  if (/^(?:the|a|an)\b/i.test(text)) {
    return text;
  }
  return `the ${text}`;
}

function conjugateVerb(value) {
  const verb = String(value || '').trim();
  if (!verb) {
    return verb;
  }
  const lower = verb.toLowerCase();
  let conjugated = '';
  if (/(?:s|sh|ch|x|z|o)$/i.test(lower)) {
    conjugated = `${lower}es`;
  } else if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(lower)) {
    conjugated = `${lower.slice(0, -1)}ies`;
  } else {
    conjugated = `${lower}s`;
  }
  if (verb[0] === verb[0].toUpperCase()) {
    return conjugated.charAt(0).toUpperCase() + conjugated.slice(1);
  }
  return conjugated;
}

function normalizeActionPhrase(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    return 'works on the story requirements';
  }
  let normalized = raw.replace(/^to\s+/i, '').replace(/\.$/, '');
  if (!normalized) {
    return 'works on the story requirements';
  }
  const lowered = normalized.toLowerCase();
  const leadingVerbs = /^(?:can|must|should|needs to|attempts to|tries to|works to|is able to)\b/;
  if (leadingVerbs.test(lowered)) {
    return normalized;
  }
  const directVerbs = /^(?:review|view|update|create|delete|manage|configure|complete|submit|see|access|verify|schedule|plan|approve|delegate)\b/;
  if (directVerbs.test(lowered)) {
    const [verb, ...rest] = normalized.split(/\s+/);
    const conjugated = conjugateVerb(verb);
    const remainder = rest.join(' ');
    return remainder ? `${conjugated} ${remainder}` : conjugated;
  }
  return `works to ${normalized}`;
}

function normalizeOutcomePhrase(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    return 'the desired outcome is verified with stakeholders';
  }
  const normalized = raw.replace(/^so that\s+/i, '').replace(/\.$/, '');
  if (!normalized) {
    return 'the desired outcome is verified with stakeholders';
  }
  return normalized;
}

function buildThenStepsFromCriteria(criteria) {
  if (!Array.isArray(criteria) || criteria.length === 0) {
    return null;
  }
  const steps = criteria
    .map((line) => String(line || '').trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*]\s*/, ''))
    .map((line) => line.replace(/^(?:then|and)\s+/i, ''))
    .map((line) => line.replace(/\.$/, ''))
    .filter((line) => line.length > 0);
  if (!steps.length) {
    return null;
  }
  return steps.map((line, index) => `${index === 0 ? 'Then' : 'And'} ${line}`);
}

export function buildAcceptanceTestFallback(story, acceptanceCriteriaInput) {
  const persona = describePersona(story?.asA);
  const actionSource = story?.iWant || story?.title || '';
  const action = normalizeActionPhrase(actionSource);
  const outcome = normalizeOutcomePhrase(story?.soThat);
  const ordinal = Array.isArray(story?.acceptanceTests)
    ? story.acceptanceTests.length + 1
    : 1;
  const titleBase = String(story?.title || '').trim() || `Story ${story?.id ?? ''}`.trim();
  const titleSuffix = titleBase ? `${titleBase} – Delegation verification #${ordinal}` : `Delegation verification #${ordinal}`;
  const criteria = normalizeAcceptanceCriteria(acceptanceCriteriaInput);
  const thenSteps = buildThenStepsFromCriteria(criteria);

  const given = [`Given ${persona} has access to the system`];
  const when = [`When ${persona} ${action}`];
  const then = thenSteps ?? [
    `Then ${outcome}`,
    'And the implementation meets the documented acceptance criteria',
  ];

  return {
    title: titleSuffix,
    given,
    when,
    then,
    status: 'Draft',
  };
}

export function buildDelegatePayload(story, formValues) {
  const values = { ...formValues };
  values.acceptanceCriteria = normalizeAcceptanceCriteria(values.acceptanceCriteria);
  return {
    storyId: story?.id ?? null,
    storyTitle: story?.title ?? '',
    repositoryApiUrl: values.repositoryApiUrl,
    owner: values.owner,
    repo: values.repo,
    target: values.target,
    targetNumber: values.target === 'new-issue' ? undefined : Number(values.targetNumber),
    branchName: values.branchName,
    taskTitle: values.taskTitle,
    objective: values.objective,
    prTitle: values.prTitle,
    constraints: values.constraints,
    acceptanceCriteria: values.acceptanceCriteria,
  };
}

export function createLocalDelegationEntry(story, formValues, response) {
  const timestamp = new Date().toISOString();
  const localId = `codex-${story?.id ?? 'story'}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    localId,
    storyId: story?.id ?? null,
    storyTitle: story?.title ?? '',
    owner: formValues.owner,
    repo: formValues.repo,
    repositoryApiUrl: formValues.repositoryApiUrl,
    branchName: formValues.branchName,
    taskTitle: formValues.taskTitle,
    objective: formValues.objective,
    prTitle: formValues.prTitle,
    constraints: formValues.constraints,
    acceptanceCriteria: formValues.acceptanceCriteria,
    target: formValues.target,
    targetNumber: response?.number ?? (formValues.target === 'new-issue' ? null : Number(formValues.targetNumber)),
    htmlUrl: response?.html_url ?? null,
    remoteId: response?.id ?? null,
    createdAt: timestamp,
    createTrackingCard: formValues.createTrackingCard !== false,
    latestStatus: null,
    lastCheckedAt: null,
    lastError: null,
  };
}

export function summarizeCommentBody(body, maxLength = 220) {
  const text = String(body || '').replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}
