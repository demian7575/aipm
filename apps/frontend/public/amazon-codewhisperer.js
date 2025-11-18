// Amazon CodeWhisperer Integration for AIPM
// Replaces the previous Codex integration with Amazon's AI coding assistant

export const DEFAULT_REPO_API_URL = 'https://api.github.com/repos/demian7575/aipm';

export function buildAcceptanceTestFallback(story) {
  if (!story) {
    return 'User can access the feature';
  }
  const persona = story.asA || 'user';
  const action = story.iWant || story.title || 'perform action';
  return `${persona} can ${action}`;
}

export function buildAcceptanceTestIdea(story) {
  if (!story) {
    return '';
  }
  const parts = [];
  if (story.asA) parts.push(`As a ${story.asA}`);
  if (story.iWant) parts.push(`I want to ${story.iWant}`);
  if (story.soThat) parts.push(`so that ${story.soThat}`);
  return parts.join(', ');
}

export function summarizeCommentBody(body) {
  if (!body || typeof body !== 'string') {
    return '';
  }
  
  const lines = body.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return '';
  }
  
  // Return first meaningful line, truncated if too long
  const firstLine = lines[0];
  return firstLine.length > 100 ? firstLine.slice(0, 97) + '...' : firstLine;
}

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
    return 'aipm/codewhisperer/branch';
  }
  const safeId = String(story.id).replace(/[^a-z0-9-]+/gi, '');
  const title = kebabCase(story.title || 'story');
  const suffix = title ? `-${title}` : '';
  const combined = `aipm/codewhisperer/${safeId}${suffix}`;
  return combined.length > 80 ? combined.slice(0, 80) : combined;
}

export function computeTaskTitle(story) {
  if (!story) {
    return 'AIPM: Delegate to Amazon CodeWhisperer';
  }
  return `AIPM: ${story.id ?? ''} ${story.title ?? ''}`.trim() + ' — Delegate to Amazon CodeWhisperer';
}

export function computeObjective(story) {
  if (!story) {
    return 'Deliver the referenced user story with Amazon CodeWhisperer support.';
  }
  const subject = story.asA ? `${story.asA} user` : 'end user';
  const want = story.iWant || story.title;
  if (want) {
    return `Enable the ${subject} to ${want}.`;
  }
  return `Deliver "${story.title}" with Amazon CodeWhisperer support.`;
}

export function computePrTitle(story) {
  if (!story) {
    return 'AIPM: Delegate to Amazon CodeWhisperer';
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

  const thenSteps = acceptanceTests
    .flatMap((test) => (Array.isArray(test.then) ? test.then : [test.then]))
    .filter((step) => step && typeof step === 'string')
    .map((step) => step.trim())
    .filter((step) => step.length > 0);

  const uniqueSteps = [...new Set(thenSteps)];
  if (uniqueSteps.length > 0) {
    return uniqueSteps.join('\n');
  }

  const persona = story.asA || 'user';
  const action = story.iWant || story.title || 'perform action';
  const outcome = story.soThat || 'achieve goal';

  const fallbackLines = [];
  if (persona) {
    fallbackLines.push(`${persona} can access the feature`);
  }
  if (action) {
    fallbackLines.push(`${persona} ${action}`);
  }
  if (outcome) {
    fallbackLines.push(`Outcome confirmed: ${outcome}`);
  }

  return fallbackLines.join('\n');
}

export function createDefaultCodeWhispererForm(story) {
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
    constraints: 'Use Amazon CodeWhisperer for AI-assisted development. Follow AWS best practices and ensure compatibility with existing AIPM architecture.',
    acceptanceCriteria: deriveAcceptanceCriteriaDefaults(story),
    createTrackingCard: true,
  };
}

function validateTargetNumber(value, target) {
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

export function ensureCodeWhispererEntryShape(entry, storyId) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  
  // Ensure the entry has the required shape
  return {
    localId: entry.localId || Math.random().toString(36).substring(2),
    storyId: storyId,
    taskTitle: entry.taskTitle || 'Unknown Task',
    objective: entry.objective || '',
    taskHtmlUrl: entry.taskHtmlUrl || '',
    threadHtmlUrl: entry.threadHtmlUrl || '',
    confirmationCode: entry.confirmationCode || '',
    createdAt: entry.createdAt || new Date().toISOString(),
    createTrackingCard: entry.createTrackingCard !== false
  };
}

export function validateCodeWhispererInput(values) {
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

  const targetError = validateTargetNumber(values.targetNumber, values.target);
  if (targetError) {
    errors.targetNumber = targetError;
  }

  if (!String(values.branchName || '').trim()) {
    errors.branchName = 'Branch name is required.';
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

  const valid = Object.keys(errors).length === 0;
  return { valid, errors };
}

export function buildDelegationPayload(story, formValues) {
  return {
    repositoryApiUrl: formValues.repositoryApiUrl,
    owner: formValues.owner,
    repo: formValues.repo,
    target: formValues.target,
    targetNumber: formValues.target === 'new-issue' ? null : parseInt(formValues.targetNumber, 10),
    branchName: formValues.branchName,
    taskTitle: formValues.taskTitle,
    objective: formValues.objective,
    prTitle: formValues.prTitle,
    constraints: formValues.constraints,
    acceptanceCriteria: formValues.acceptanceCriteria,
  };
}

export function createLocalDelegationEntry(story, formValues, response) {
  const timestamp = new Date().toISOString();
  const localId = `codewhisperer-${story?.id ?? 'story'}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
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
    targetNumber: formValues.targetNumber,
    // Store PR/issue information from response
    type: response?.type || 'task',
    html_url: response?.html_url || response?.taskHtmlUrl,
    prUrl: response?.prUrl || response?.html_url,
    taskHtmlUrl: response?.taskHtmlUrl,
    threadHtmlUrl: response?.threadHtmlUrl,
    number: response?.number,
    confirmationCode: response?.confirmationCode,
    issueUrl: response?.issueUrl ?? null,
    commentUrl: response?.commentUrl ?? null,
    createdAt: timestamp,
    lastPolledAt: null,
    latestReply: null,
    latestStatus: null,
    isActive: true,
    createTrackingCard: formValues.createTrackingCard !== false,
  };
}
