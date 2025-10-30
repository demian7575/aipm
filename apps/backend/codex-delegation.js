import { randomUUID } from 'node:crypto';
import { sanitizeRepositoryUrl } from './codex-utils.js';
import { queueBuiltInDelegation } from './codex-builtin-service.js';

function buildStorySnapshot(story) {
  if (!story || typeof story !== 'object') {
    return {};
  }
  return {
    id: story.id,
    title: story.title,
    description: story.description,
    asA: story.asA,
    iWant: story.iWant,
    soThat: story.soThat,
    components: Array.isArray(story.components) ? story.components : [],
    storyPoint: story.storyPoint ?? null,
    status: story.status,
    acceptanceTests: Array.isArray(story.acceptanceTests)
      ? story.acceptanceTests.map((test) => ({
          id: test.id,
          title: test.title ?? '',
          status: test.status ?? '',
          given: Array.isArray(test.given)
            ? test.given.map((step) => String(step))
            : typeof test.given === 'string'
            ? [test.given]
            : [],
          when: Array.isArray(test.when)
            ? test.when.map((step) => String(step))
            : typeof test.when === 'string'
            ? [test.when]
            : [],
          then: Array.isArray(test.then)
            ? test.then.map((step) => String(step))
            : typeof test.then === 'string'
            ? [test.then]
            : [],
        }))
      : [],
    tasks: Array.isArray(story.tasks)
      ? story.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          assigneeEmail: task.assigneeEmail,
        }))
      : [],
  };
}

function normalizeRemoteResponse(body, context) {
  if (!body || typeof body !== 'object') {
    throw Object.assign(new Error('Delegation service returned an invalid response'), {
      statusCode: 502,
    });
  }
  const candidates = [body.id, body.delegationId, body.delegation_id, body.taskId, body.jobId];
  const identifier = candidates.find((value) => typeof value === 'string' && value.trim());
  const prUrlCandidates = [
    body.prUrl,
    body.pr_url,
    body.pullRequestUrl,
    body.pull_request_url,
    body.result?.prUrl,
    body.result?.pullRequestUrl,
  ];
  const prUrl = prUrlCandidates.find((value) => typeof value === 'string' && value.trim()) ?? '';
  const statusCandidates = [body.status, body.state, body.result?.status, body.result?.state];
  const status = statusCandidates.find((value) => typeof value === 'string' && value.trim()) ?? 'In Progress';
  const summaryCandidates = [body.summary, body.message, body.result?.summary];
  const summary = summaryCandidates.find((value) => typeof value === 'string' && value.trim()) ?? '';

  return {
    id: identifier ? identifier.trim() : randomUUID(),
    prUrl,
    status,
    summary,
    metadata: body,
    source: 'remote',
    repositoryUrl: context.repositoryUrl,
    branch: context.branch,
    plan: context.plan,
    queuedAt: new Date().toISOString(),
  };
}

export async function delegateToCodex({
  story,
  repositoryUrl,
  branch,
  plan,
  instructions,
  additionalContext = '',
  codexUserEmail,
}) {
  const endpoint = process.env.CODEX_DELEGATION_URL;
  const sanitizedRepositoryUrl = sanitizeRepositoryUrl(repositoryUrl) || repositoryUrl;
  const payload = {
    story: buildStorySnapshot(story),
    repositoryUrl: sanitizedRepositoryUrl,
    branch,
    plan,
    instructions,
    additionalContext,
    operator: codexUserEmail,
  };

  if (endpoint) {
    try {
      if (typeof fetch !== 'function') {
        throw Object.assign(new Error('Delegation requires fetch support in Node.js'), {
          statusCode: 500,
        });
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (error) {
          throw Object.assign(new Error('Delegation service returned invalid JSON'), {
            statusCode: 502,
            cause: error,
          });
        }
      }
      if (!response.ok) {
        const error = new Error(
          (data && typeof data.message === 'string' && data.message) ||
            `Delegation service responded with status ${response.status}`,
        );
        error.statusCode = response.status || 502;
        error.details = data;
        throw error;
      }
      return normalizeRemoteResponse(data, {
        repositoryUrl: sanitizedRepositoryUrl,
        branch,
        plan,
      });
    } catch (error) {
      if (process.env.CODEX_DELEGATION_REQUIRE_SUCCESS === '1') {
        throw error;
      }
      console.warn(
        'Codex delegation endpoint unavailable, using built-in delegation service instead.',
        error,
      );
    }
  }

  return queueBuiltInDelegation({
    story,
    repositoryUrl: sanitizedRepositoryUrl,
    branch,
    plan,
    instructions,
    additionalContext,
    codexUserEmail,
  });
}
