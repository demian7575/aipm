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
    acceptanceCriteria: '',
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
