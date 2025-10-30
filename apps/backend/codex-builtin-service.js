import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildDelegationSummary,
  createDelegationEvent,
  generatePullRequestUrl,
  sanitizeRepositoryUrl,
} from './codex-utils.js';
import {
  createChatgptCodexTask,
  isChatgptCodexConfigured,
} from './codex-chatgpt-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'codex-delegations.json');

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const existing = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(existing);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.delegations)) {
      return parsed;
    }
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
  }
  const initial = { delegations: [] };
  await writeFile(STORE_PATH, JSON.stringify(initial, null, 2));
  return initial;
}

async function readStore() {
  try {
    const content = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.delegations)) {
      return parsed;
    }
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
    return ensureStore();
  }
  return ensureStore();
}

async function writeStore(store) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

function presentDelegation(record) {
  if (!record) {
    return null;
  }
  const events = Array.isArray(record.events) ? record.events.slice() : [];
  return {
    id: record.id,
    storyId: record.storyId ?? null,
    storyTitle: record.storyTitle ?? null,
    repositoryUrl: record.repositoryUrl ?? '',
    branch: record.branch ?? 'main',
    plan: record.plan ?? 'personal-plus',
    operator: record.operator ?? '',
    instructions: record.instructions ?? '',
    additionalContext: record.additionalContext ?? '',
    status: record.status ?? 'Queued',
    prUrl: record.prUrl ?? '',
    summary: record.summary ?? '',
    result: record.result ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    queuedAt: record.queuedAt ?? record.createdAt,
    chatgptTaskId: record.chatgptTaskId ?? null,
    chatgptTaskUrl: record.chatgptTaskUrl ?? '',
    chatgptTaskStatus: record.chatgptTaskStatus ?? null,
    events,
  };
}

function createDelegationRecord({
  story,
  repositoryUrl,
  branch,
  plan,
  instructions,
  additionalContext,
  codexUserEmail,
}) {
  const createdAt = new Date().toISOString();
  const normalizedRepository = sanitizeRepositoryUrl(repositoryUrl) || repositoryUrl || '';
  const record = {
    id: `builtin-${randomUUID()}`,
    storyId: story?.id ?? null,
    storyTitle: story?.title ?? 'Untitled',
    repositoryUrl: normalizedRepository,
    branch,
    plan,
    operator: codexUserEmail,
    instructions,
    additionalContext,
    status: 'Queued',
    prUrl: generatePullRequestUrl(normalizedRepository),
    summary: buildDelegationSummary({
      storyTitle: story?.title ?? 'Untitled',
      plan,
      instructions,
      additionalContext,
      originLabel: isChatgptCodexConfigured() ? 'ChatGPT Codex' : 'Built-in',
    }),
    createdAt,
    updatedAt: createdAt,
    queuedAt: createdAt,
    chatgptTaskId: null,
    chatgptTaskUrl: '',
    chatgptTaskStatus: null,
    events: [
      createDelegationEvent({
        type: 'queued',
        status: 'Queued',
        message: 'Delegation queued by built-in service',
        details: {
          repositoryUrl: normalizedRepository,
          branch,
          plan,
        },
      }),
    ],
  };
  return record;
}

export async function queueBuiltInDelegation({
  story,
  repositoryUrl,
  branch,
  plan,
  instructions,
  additionalContext,
  codexUserEmail,
}) {
  const store = await readStore();
  const record = createDelegationRecord({
    story,
    repositoryUrl,
    branch,
    plan,
    instructions,
    additionalContext,
    codexUserEmail,
  });
  store.delegations.unshift(record);
  await writeStore(store);

  let chatgptTask = null;
  if (isChatgptCodexConfigured()) {
    try {
      chatgptTask = await createChatgptCodexTask(record);
      if (chatgptTask) {
        record.chatgptTaskId = chatgptTask.id;
        record.chatgptTaskUrl = chatgptTask.url;
        record.chatgptTaskStatus = chatgptTask.status;
        if (chatgptTask.summary) {
          record.summary = chatgptTask.summary;
        }
        if (chatgptTask.status) {
          record.status = chatgptTask.status;
        }
        record.events.push(
          createDelegationEvent({
            type: 'chatgpt-sync',
            status: record.status,
            message:
              chatgptTask.summary || 'Delegation synced with ChatGPT Codex',
            details: {
              taskId: chatgptTask.id,
              taskUrl: chatgptTask.url,
              endpoint: chatgptTask.endpoint,
            },
          }),
        );
        record.result = {
          ...(record.result ?? {}),
          chatgpt: chatgptTask.raw ?? null,
        };
        record.updatedAt = new Date().toISOString();
        await writeStore(store);
      }
    } catch (error) {
      record.events.push(
        createDelegationEvent({
          type: 'chatgpt-sync-failed',
          status: record.status,
          message: error?.message || 'Failed to sync with ChatGPT Codex',
          details: {
            endpoint: process.env.CODEX_CHATGPT_TASKS_URL || undefined,
          },
        }),
      );
      record.updatedAt = new Date().toISOString();
      await writeStore(store);
      if (process.env.CODEX_CHATGPT_REQUIRE_SUCCESS === '1') {
        throw error;
      }
      console.warn('Failed to sync delegation with ChatGPT Codex', error);
    }
  }

  return {
    id: record.id,
    prUrl: record.prUrl,
    status: record.status,
    summary: record.summary,
    metadata: {
      repositoryUrl: record.repositoryUrl,
      branch: record.branch,
      plan: record.plan,
      additionalContext: record.additionalContext,
      builtIn: true,
      chatgptTask: chatgptTask
        ? {
            id: chatgptTask.id,
            url: chatgptTask.url,
            status: chatgptTask.status,
          }
        : null,
    },
    source: chatgptTask ? 'chatgpt' : 'builtin',
    repositoryUrl: record.repositoryUrl,
    branch: record.branch,
    plan: record.plan,
    queuedAt: record.queuedAt,
    chatgptTaskUrl: record.chatgptTaskUrl,
  };
}

export async function listBuiltInDelegations() {
  const store = await readStore();
  return store.delegations.map(presentDelegation);
}

export async function getBuiltInDelegation(id) {
  const store = await readStore();
  const record = store.delegations.find((entry) => entry.id === id);
  return presentDelegation(record);
}

function applyPatch(record, patch) {
  if (!patch || typeof patch !== 'object') {
    return false;
  }
  let changed = false;
  const now = new Date().toISOString();
  if (typeof patch.status === 'string' && patch.status.trim()) {
    record.status = patch.status.trim();
    changed = true;
  }
  if (typeof patch.prUrl === 'string') {
    record.prUrl = patch.prUrl.trim();
    changed = true;
  }
  if (typeof patch.summary === 'string') {
    record.summary = patch.summary.trim();
    changed = true;
  }
  if (typeof patch.result === 'object' && patch.result !== null) {
    record.result = patch.result;
    changed = true;
  }
  if (typeof patch.chatgptTaskId === 'string') {
    record.chatgptTaskId = patch.chatgptTaskId.trim();
    changed = true;
  }
  if (typeof patch.chatgptTaskUrl === 'string') {
    record.chatgptTaskUrl = patch.chatgptTaskUrl.trim();
    changed = true;
  }
  if (typeof patch.chatgptTaskStatus === 'string') {
    record.chatgptTaskStatus = patch.chatgptTaskStatus.trim();
    changed = true;
  }
  if (typeof patch.additionalContext === 'string') {
    record.additionalContext = patch.additionalContext.trim();
    changed = true;
  }
  if (typeof patch.instructions === 'string') {
    record.instructions = patch.instructions.trim();
    changed = true;
  }
  if (patch.appendEvent && typeof patch.appendEvent === 'object') {
    const event = createDelegationEvent({
      type: typeof patch.appendEvent.type === 'string' ? patch.appendEvent.type : 'update',
      status: record.status,
      message:
        typeof patch.appendEvent.message === 'string' ? patch.appendEvent.message : undefined,
      details: patch.appendEvent.details,
    });
    record.events.push(event);
    changed = true;
  }
  if (changed) {
    record.updatedAt = now;
  }
  return changed;
}

export async function updateBuiltInDelegation(id, patch) {
  const store = await readStore();
  const record = store.delegations.find((entry) => entry.id === id);
  if (!record) {
    return null;
  }
  const changed = applyPatch(record, patch);
  if (changed) {
    await writeStore(store);
  }
  return presentDelegation(record);
}

export async function clearBuiltInDelegations() {
  await writeStore({ delegations: [] });
}
