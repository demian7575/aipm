#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createApp, DATABASE_PATH, resetDatabaseFactory } from '../apps/backend/app.js';

async function resetRuntimeFiles() {
  resetDatabaseFactory();
  await fs.rm(DATABASE_PATH, { force: true });
  await fs.rm(`${DATABASE_PATH}.json`, { force: true });
  const dataDir = path.dirname(DATABASE_PATH);
  await fs.rm(path.join(dataDir, 'codex-delegations.json'), { force: true });
}

async function launchServer() {
  const app = await createApp();
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address !== 'object') {
        reject(new Error('Failed to determine server address'));
        return;
      }
      resolve({ server, port: address.port });
    });
    server.once('error', reject);
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch (error) {
      throw Object.assign(new Error(`Invalid JSON response from ${url}`), { cause: error });
    }
  }
  if (!response.ok) {
    const message = body && typeof body.message === 'string' ? body.message : `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function formatTask(task) {
  if (!task) return '• <unknown task>';
  const title = task.title ? String(task.title) : '<untitled>';
  const status = task.status ? String(task.status) : 'Unknown';
  return `• ${title} [${status}]`;
}

async function main() {
  process.env.AI_PM_DISABLE_OPENAI = '1';
  if (!process.env.CODEX_DELEGATION_URL) {
    delete process.env.CODEX_DELEGATION_URL;
  }

  await resetRuntimeFiles();
  const { server, port } = await launchServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    console.log(`Started temporary server on ${baseUrl}`);
    const stories = await fetchJson(`${baseUrl}/api/stories`);
    if (!Array.isArray(stories) || stories.length === 0) {
      throw new Error('Seed dataset did not return any stories.');
    }
    const story = stories[0];
    console.log(`Using story #${story.id} (${story.title ?? 'Untitled'}) for delegation test.`);
    const codexUserEmail = story.assigneeEmail || 'owner@example.com';

    const delegationPayload = {
      repositoryUrl: '',
      plan: 'personal-plus',
      branch: '',
      codexUserEmail,
      instructions: 'Implement the story end-to-end as part of the smoke test.',
      additionalContext: 'Smoke test triggered via scripts/smoke-codex-delegation.mjs',
    };

    const delegation = await fetchJson(`${baseUrl}/api/stories/${story.id}/codex/delegate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(delegationPayload),
    });

    const agentSource = delegation?.delegation?.source || 'unknown';
    console.log(`Delegation accepted by ${agentSource} agent.`);
    if (delegation?.delegation?.id) {
      console.log(`Delegation ID: ${delegation.delegation.id}`);
    }
    if (delegation?.delegation?.prUrl) {
      console.log(`Pull request placeholder: ${delegation.delegation.prUrl}`);
    }
    const chatgptTask = delegation?.delegation?.metadata?.chatgptTask;
    if (chatgptTask?.url) {
      console.log(`ChatGPT Codex task: ${chatgptTask.url}`);
    }
    if (chatgptTask?.status) {
      console.log(`ChatGPT Codex status: ${chatgptTask.status}`);
    }

    const tasks = Array.isArray(delegation?.tasks) ? delegation.tasks : [];
    if (!tasks.length) {
      console.warn('No tasks returned from delegation response.');
    } else {
      console.log('Tasks created:');
      for (const task of tasks) {
        console.log(`  ${formatTask(task)}`);
      }
    }

    const delegations = await fetchJson(`${baseUrl}/api/codex/delegations`);
    if (Array.isArray(delegations) && delegation?.delegation?.id) {
      const stored = delegations.find((entry) => entry && entry.id === delegation.delegation.id);
      if (stored) {
        console.log(`Ledger entry status: ${stored.status}`);
        console.log(`Ledger stored at: ${stored.createdAt}`);
      } else {
        console.warn('Delegation not found in built-in service ledger.');
      }
    }

    const refreshedStories = await fetchJson(`${baseUrl}/api/stories`);
    const refreshed = Array.isArray(refreshedStories)
      ? refreshedStories.find((item) => item && item.id === story.id)
      : null;
    if (refreshed && Array.isArray(refreshed.tasks)) {
      console.log('Story tasks after delegation:');
      refreshed.tasks
        .filter((task) => task && typeof task.title === 'string')
        .forEach((task) => {
          console.log(`  ${formatTask(task)}`);
        });
    }

    console.log('\nSmoke test complete. If you need to inspect the stored ledger manually, review apps/backend/data/codex-delegations.json.');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

main().catch((error) => {
  console.error('Codex delegation smoke test failed:', error);
  process.exitCode = 1;
});
