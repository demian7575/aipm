import { randomUUID } from 'node:crypto';

export function sanitizeRepositoryUrl(value) {
  if (!value) {
    return '';
  }
  let text = String(value).trim();
  if (!text) {
    return '';
  }
  text = text.replace(/\.git$/i, '');
  text = text.replace(/\/+$/, '');
  return text;
}

export function buildDelegationSummary({
  storyTitle,
  plan,
  instructions,
  additionalContext,
  originLabel = 'Built-in',
}) {
  const parts = [`${originLabel} delegation queued for story "${storyTitle ?? 'Untitled'}" using plan ${plan}.`];
  if (instructions) {
    const trimmed = instructions.trim();
    if (trimmed) {
      const truncated = trimmed.length > 180 ? `${trimmed.slice(0, 177)}…` : trimmed;
      parts.push(`Instructions: ${truncated}`);
    }
  }
  if (additionalContext) {
    const trimmed = additionalContext.trim();
    if (trimmed) {
      const truncated = trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed;
      parts.push(`Context: ${truncated}`);
    }
  }
  return parts.join(' ');
}

export function generatePullRequestUrl(repositoryUrl) {
  const normalized = sanitizeRepositoryUrl(repositoryUrl);
  if (!normalized) {
    return '';
  }
  const prNumber = Math.floor(Math.random() * 9000) + 1000;
  return `${normalized}/pull/${prNumber}`;
}

export function createDelegationEvent({ type = 'update', status, message, details }) {
  return {
    id: `event-${randomUUID()}`,
    type,
    status: status || null,
    message: message || '',
    details: details ?? null,
    createdAt: new Date().toISOString(),
  };
}
