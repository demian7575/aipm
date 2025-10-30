import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  COMPONENT_CATALOG,
  createApp,
  DATABASE_PATH,
  openDatabase,
  resetDatabaseFactory,
} from '../apps/backend/app.js';
import { generateSampleDataset } from '../scripts/generate-sample-dataset.mjs';

process.env.AI_PM_DISABLE_OPENAI = '1';
delete process.env.AI_PM_OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.CODEX_CHATGPT_AUTH_TOKEN;
delete process.env.CODEX_CHATGPT_TASKS_URL;
delete process.env.CODEX_CHATGPT_REQUIRE_SUCCESS;

async function resetDatabaseFiles() {
  await fs.rm(DATABASE_PATH, { force: true });
  await fs.rm(`${DATABASE_PATH}.json`, { force: true });
  const builtInDelegationsPath = path.join(
    path.dirname(DATABASE_PATH),
    'codex-delegations.json'
  );
  await fs.rm(builtInDelegationsPath, { force: true });
}

async function startServer() {
  const app = await createApp();
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

test('stories CRUD with reference documents', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;

const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(Array.isArray(stories));
  assert.equal(stories.length, 1);
  const story = stories[0];
  const originalTestCount = Array.isArray(story.acceptanceTests) ? story.acceptanceTests.length : 0;
  assert.equal(story.storyPoint, 5);
  assert.equal(story.assigneeEmail, 'pm@example.com');
  assert.ok(Array.isArray(story.components));
  assert.ok(story.components.length > 0);
  assert.ok(Array.isArray(story.tasks));
  assert.ok(story.tasks.length >= 2);
  assert.ok(story.tasks.every((task) => typeof task.title === 'string'));
  assert.ok(Array.isArray(story.dependencies));
  assert.ok(Array.isArray(story.dependents));
  assert.ok(Array.isArray(story.blockedBy));
  assert.ok(Array.isArray(story.blocking));
  if (Array.isArray(story.children) && story.children.length > 0) {
    const blockedChild = story.children.find((child) => child && child.status === 'Blocked');
    assert.ok(blockedChild, 'Seed data should include a blocked child story');
    assert.ok(Array.isArray(blockedChild.dependencies));
    assert.ok(Array.isArray(blockedChild.blockedBy));
    assert.ok(blockedChild.blockedBy.length >= 1, 'Blocked story should reference blockers');
    assert.ok(
      blockedChild.blockedBy.every((entry) => entry && entry.relationship === 'blocks'),
      'Blocked story blockers should be marked as blocks relationships'
    );
  }
  assert.ok(
    story.tasks.every((task) => typeof task.assigneeEmail === 'string' && task.assigneeEmail.trim().length > 0),
    'Each task should include an assignee email'
  );
  assert.ok(story.investHealth);
  assert.equal(typeof story.investHealth.satisfied, 'boolean');
  assert.ok(Array.isArray(story.investHealth.issues));
  assert.ok(story.investAnalysis);
  assert.ok(Array.isArray(story.investAnalysis.aiWarnings));
  assert.ok(Array.isArray(story.investAnalysis.fallbackWarnings));
  assert.equal(typeof story.investAnalysis.usedFallback, 'boolean');
  assert.ok(['heuristic', 'fallback', 'openai'].includes(story.investAnalysis.source));
  assert.ok(
    story.investHealth.issues.every(
      (issue) => !/acceptance tests reach Pass status/i.test(issue.message)
    )
  );
  if (story.acceptanceTests.length) {
    assert.ok(story.acceptanceTests[0].gwtHealth);
    assert.equal(typeof story.acceptanceTests[0].gwtHealth.satisfied, 'boolean');
  }

  const primaryComponents = COMPONENT_CATALOG.length
    ? COMPONENT_CATALOG.slice(0, Math.min(2, COMPONENT_CATALOG.length))
    : ['WorkModel'];
  const patchResponse = await fetch(`${baseUrl}/api/stories/${story.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storyPoint: 8,
      assigneeEmail: 'owner@example.com',
      title: story.title,
      description: story.description,
      components: primaryComponents,
    }),
  });
  assert.equal(patchResponse.status, 200);
  const updated = await patchResponse.json();
  assert.equal(updated.storyPoint, 8);
  assert.equal(updated.assigneeEmail, 'owner@example.com');
  assert.deepEqual(updated.components, primaryComponents);
  assert.ok(Array.isArray(updated.acceptanceTests));
  assert.ok(Array.isArray(updated.tasks));
  assert.ok(updated.tasks.length >= story.tasks.length);
  assert.ok(
    updated.tasks.every((task) => typeof task.assigneeEmail === 'string' && task.assigneeEmail.trim().length > 0),
    'Updated story payload should include task assignees'
  );
  assert.ok(
    updated.acceptanceTests.length >= originalTestCount + 1,
    'Story update should retain existing tests and add a draft verification'
  );
  assert.ok(
    updated.acceptanceTests.some((test) => test.status === 'Need review with update'),
    'Existing acceptance tests should require review after story edits'
  );
  const draftTests = updated.acceptanceTests.filter((test) => test.status === 'Draft');
  assert.ok(draftTests.length >= 1, 'Story edits should create a draft acceptance test');
  assert.ok(
    draftTests.every((test) => Array.isArray(test.then) && test.then.length > 0),
    'Draft acceptance tests should include Then steps'
  );

  const blockedResponse = await fetch(`${baseUrl}/api/stories/${story.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: updated.title,
      description: updated.description ?? '',
      components: updated.components,
      storyPoint: updated.storyPoint,
      assigneeEmail: updated.assigneeEmail,
      status: 'Blocked',
      asA: updated.asA ?? story.asA,
      iWant: updated.iWant ?? story.iWant,
      soThat: updated.soThat ?? story.soThat,
    }),
  });
  assert.equal(blockedResponse.status, 200);
  const blockedStory = await blockedResponse.json();
  assert.equal(blockedStory.status, 'Blocked');

  const healthResponse = await fetch(`${baseUrl}/api/stories/${story.id}/health-check`, {
    method: 'POST',
  });
  assert.equal(healthResponse.status, 200);
  const healthStory = await healthResponse.json();
  assert.ok(Array.isArray(healthStory.acceptanceTests));
  assert.ok(Array.isArray(healthStory.components));
  assert.deepEqual(healthStory.components, primaryComponents);
  assert.ok(
    healthStory.acceptanceTests.length >= originalTestCount + 1,
    'Health check should return acceptance tests including the new draft after story update'
  );
  assert.ok(
    healthStory.acceptanceTests.filter((test) => test.status === 'Need review with update').length >= originalTestCount,
    'Health check should preserve review-needed status for existing tests'
  );

  const childComponents = COMPONENT_CATALOG.slice(2, 4).length
    ? COMPONENT_CATALOG.slice(2, 4)
    : primaryComponents;
  const childResponse = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Child estimation',
      parentId: story.id,
      storyPoint: 3,
      assigneeEmail: 'engineer@example.com',
      description: 'Implements supporting UI',
      asA: 'User',
      iWant: 'complete a two-factor login',
      soThat: 'my account stays safe',
      components: childComponents,
    }),
  });
  assert.equal(childResponse.status, 201);
  const child = await childResponse.json();
  assert.equal(child.storyPoint, 3);
  assert.deepEqual(child.components, childComponents);
  assert.ok(child.investHealth);
  assert.ok(child.investAnalysis);
  assert.ok(Array.isArray(child.investAnalysis.aiWarnings));
  assert.ok(Array.isArray(child.investAnalysis.fallbackWarnings));
  assert.ok(Array.isArray(child.acceptanceTests));
  assert.ok(child.acceptanceTests.length >= 1, 'New child story should have an automatic acceptance test');
  assert.ok(Array.isArray(child.tasks));
  assert.ok(child.tasks.length >= 0);
  assert.ok(
    child.tasks.every((task) => typeof task.assigneeEmail === 'string' && task.assigneeEmail.trim().length > 0),
    'Child story tasks should include assignees'
  );
  assert.ok(
    child.acceptanceTests.every((test) => test.status === 'Draft'),
    'Automatically created acceptance tests start as Draft'
  );
  assert.ok(
    child.acceptanceTests.every((test) => Array.isArray(test.then) && test.then.length > 0),
    'Automatically created acceptance tests include Then steps'
  );

  const draftIdea =
    'As a compliance officer I want audit logging so that we meet regulations and pass audits';
  const draftResponse = await fetch(`${baseUrl}/api/stories/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea: draftIdea, parentId: story.id }),
  });
  assert.equal(draftResponse.status, 200);
  const draftStory = await draftResponse.json();
  assert.equal(typeof draftStory.title, 'string');
  assert.ok(draftStory.title.toLowerCase().includes('audit logging'));
  assert.equal(draftStory.asA, 'Compliance officer');
  assert.ok(draftStory.iWant.toLowerCase().includes('audit'));
  assert.equal(draftStory.soThat, 'We meet regulations and pass audits');
  assert.ok(
    draftStory.description.includes('As a Compliance officer'),
    'Generated description should mention the persona'
  );
  assert.ok(
    draftStory.description.toLowerCase().includes('implement audit logging'),
    'Generated description should describe the goal naturally'
  );
  assert.equal(draftStory.storyPoint, 4);
  assert.equal(draftStory.assigneeEmail, 'owner@example.com');
  assert.ok(Array.isArray(draftStory.components));
  assert.deepEqual(draftStory.components, updated.components);

  const aiDraftResponse = await fetch(`${baseUrl}/api/stories/${story.id}/tests/draft`, {
    method: 'POST',
  });
  assert.equal(aiDraftResponse.status, 200);
  const aiDraft = await aiDraftResponse.json();
  assert.ok(Array.isArray(aiDraft.given) && aiDraft.given.length > 0);
  assert.ok(Array.isArray(aiDraft.when) && aiDraft.when.length > 0);
  assert.ok(Array.isArray(aiDraft.then) && aiDraft.then.length > 0);
  assert.equal(aiDraft.status, 'Draft');

  const ideaText = 'validate audit log entries for approved changes';
  const ideaDraftResponse = await fetch(`${baseUrl}/api/stories/${story.id}/tests/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea: ideaText }),
  });
  assert.equal(ideaDraftResponse.status, 200);
  const ideaDraft = await ideaDraftResponse.json();
  assert.ok(Array.isArray(ideaDraft.when) && ideaDraft.when.length > 0);
  assert.ok(
    ideaDraft.when.some((step) => step.toLowerCase().includes('validate audit log entries')),
    'When step should incorporate the provided idea'
  );
  assert.ok(
    ideaDraft.given.some((step) => step.toLowerCase().includes('idea "validate audit log entries for approved changes"')),
    'Given step should reference the supplied idea explicitly'
  );
  assert.ok(Array.isArray(ideaDraft.then) && ideaDraft.then.length > 0);
  assert.equal(ideaDraft.status, 'Draft');

  const taskCreateResponse = await fetch(`${baseUrl}/api/stories/${story.id}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Validate login analytics',
      status: 'In Progress',
      description: 'Review telemetry and confirm KPI coverage.',
      assigneeEmail: 'qa@example.com',
    }),
  });
  assert.equal(taskCreateResponse.status, 201);
  const createdTask = await taskCreateResponse.json();
  assert.equal(createdTask.title, 'Validate login analytics');
  assert.equal(createdTask.status, 'In Progress');
  assert.equal(createdTask.assigneeEmail, 'qa@example.com');

  const missingAssigneeResponse = await fetch(`${baseUrl}/api/stories/${story.id}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Unassigned task',
      status: 'Not Started',
      description: 'Should fail due to missing assignee',
    }),
  });
  assert.equal(missingAssigneeResponse.status, 400);
  await missingAssigneeResponse.text();

  const taskUpdateResponse = await fetch(`${baseUrl}/api/tasks/${createdTask.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Done',
      description: 'Telemetry confirms success.',
      assigneeEmail: 'lead.qa@example.com',
    }),
  });
  assert.equal(taskUpdateResponse.status, 200);
  const updatedTask = await taskUpdateResponse.json();
  assert.equal(updatedTask.status, 'Done');
  assert.equal(updatedTask.description, 'Telemetry confirms success.');
  assert.equal(updatedTask.assigneeEmail, 'lead.qa@example.com');

  const postTaskStoriesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(postTaskStoriesResponse.status, 200);
  const postTaskStories = await postTaskStoriesResponse.json();
  const refreshedStory = postTaskStories.find((item) => item.id === story.id);
  assert.ok(refreshedStory);
  assert.ok(Array.isArray(refreshedStory.tasks));
  assert.ok(refreshedStory.tasks.some((task) => task.id === createdTask.id && task.status === 'Done'));

  const fallbackComponent = primaryComponents[0] || COMPONENT_CATALOG[0] || 'WorkModel';
  const invalidStoryPoint = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Bad estimation',
      storyPoint: -2,
      asA: 'User',
      iWant: 'do something',
      soThat: 'it works',
      components: [fallbackComponent],
    }),
  });
  assert.equal(invalidStoryPoint.status, 400);
  const invalidBody = await invalidStoryPoint.json();
  assert.match(invalidBody.message, /Story point/i);

  const invalidComponents = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Bad components',
      asA: 'User',
      iWant: 'use unknown scope',
      soThat: 'tests coverage exists',
      components: ['Unknown scope'],
    }),
  });
  assert.equal(invalidComponents.status, 400);
  const invalidComponentsBody = await invalidComponents.json();
  assert.equal(invalidComponentsBody.code, 'INVALID_COMPONENTS');
  assert.ok(invalidComponentsBody.details);

  const docResponse = await fetch(`${baseUrl}/api/stories/${story.id}/reference-documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'API Spec', url: 'https://example.com/api' }),
  });
  assert.equal(docResponse.status, 201);
  const doc = await docResponse.json();
  assert.equal(doc.name, 'API Spec');

  const uploadResponse = await fetch(`${baseUrl}/api/uploads?filename=checklist.txt`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: Buffer.from('Security review must cover 5 controls'),
  });
  assert.equal(uploadResponse.status, 201);
  const uploadInfo = await uploadResponse.json();
  assert.ok(uploadInfo.url.startsWith('/uploads/'));
  const uploadsDir = path.join(path.dirname(DATABASE_PATH), '..', 'uploads');
  const uploadPath = path.join(uploadsDir, path.basename(uploadInfo.url));
  await fs.access(uploadPath);

  const localDocResponse = await fetch(`${baseUrl}/api/stories/${story.id}/reference-documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Uploaded Checklist', url: uploadInfo.url }),
  });
  assert.equal(localDocResponse.status, 201);
  const localDoc = await localDocResponse.json();
  assert.equal(localDoc.name, 'Uploaded Checklist');

  const fileFetch = await fetch(`${baseUrl}${uploadInfo.url}`);
  assert.equal(fileFetch.status, 200);
  const fileText = await fileFetch.text();
  assert.match(fileText, /Security review/);

  const deleteLocal = await fetch(`${baseUrl}/api/reference-documents/${localDoc.id}`, {
    method: 'DELETE',
  });
  assert.equal(deleteLocal.status, 204);
  await assert.rejects(fs.stat(uploadPath));

  const finalStories = await fetch(`${baseUrl}/api/stories`);
  const finalData = await finalStories.json();
  assert.equal(finalData[0].referenceDocuments.length, 2);
  if (finalData[0].acceptanceTests.length) {
    assert.ok(finalData[0].acceptanceTests[0].gwtHealth);
  }

  const runtimeResponse = await fetch(`${baseUrl}/api/runtime-data`);
  assert.equal(runtimeResponse.status, 200);
  const disposition = runtimeResponse.headers.get('content-disposition') ?? '';
  assert.match(disposition, /app\.sqlite/);
  const runtimeBuffer = Buffer.from(await runtimeResponse.arrayBuffer());
  assert.ok(runtimeBuffer.length > 0, 'Runtime data download should return file contents');
  const header = Buffer.from('SQLite format 3\0');
  assert.deepEqual(
    runtimeBuffer.subarray(0, header.length),
    header,
    'Runtime data should be a valid SQLite database file'
  );
  await fs.access(DATABASE_PATH);
});

test('acceptance tests allow observable outcomes without numeric metrics', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(Array.isArray(stories));
  assert.ok(stories.length > 0);
  const story = stories[0];

  const payload = {
    given: ['Given an auditor is on the approvals page'],
    when: ['When they approve a pending request'],
    then: ['Then a confirmation banner is displayed and the request status updates to Approved'],
    status: 'Draft',
  };

  const createResponse = await fetch(`${baseUrl}/api/stories/${story.id}/tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.ok(created);
  assert.equal(created.status, 'Draft');
  assert.ok(Array.isArray(created.then));
  assert.ok(
    created.then[0].toLowerCase().includes('confirmation banner'),
    'Then step should reflect the observable outcome'
  );
  assert.ok(created.gwtHealth);
  assert.equal(
    created.gwtHealth.satisfied,
    true,
    'Observable outcomes should satisfy GWT health checks'
  );
  assert.ok(Array.isArray(created.gwtHealth.issues));
  assert.equal(created.gwtHealth.issues.length, 0);
  assert.ok(Array.isArray(created.measurabilityWarnings));
  assert.equal(created.measurabilityWarnings.length, 0);
});

test('acceptance tests treat DoD and blocker statements as observable outcomes', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(Array.isArray(stories));
  assert.ok(stories.length > 0);
  const story = stories[0];

  const payload = {
    given: ['Given the story acceptance criteria are defined'],
    when: ['When the delivery team reviews the Definition of Done checklist'],
    then: ['Then outputs for the story meet DoD standards', 'And no open blockers remain for the release'],
    status: 'Draft',
  };

  const response = await fetch(`${baseUrl}/api/stories/${story.id}/tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.ok(created);
  assert.ok(created.gwtHealth);
  assert.equal(created.gwtHealth.satisfied, true);
  assert.ok(Array.isArray(created.gwtHealth.issues));
  assert.equal(created.gwtHealth.issues.length, 0);
  assert.ok(Array.isArray(created.measurabilityWarnings));
  assert.equal(created.measurabilityWarnings.length, 0);
});

test('story dependencies can be added and removed through the API', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const primaryPayload = {
    title: 'Mindmap dependency manager',
    description: 'Allow PMs to manage story links from the details panel.',
    asA: 'As a portfolio manager',
    iWant: 'I want to connect related work items',
    soThat: 'So that delivery blockers are visible early',
    components: COMPONENT_CATALOG.length ? [COMPONENT_CATALOG[0]] : ['WorkModel'],
    storyPoint: 3,
    assigneeEmail: 'pm@example.com',
  };

  const createPrimary = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(primaryPayload),
  });
  assert.equal(createPrimary.status, 201);
  const primaryStory = await createPrimary.json();
  assert.ok(primaryStory);

  const dependencyPayload = {
    ...primaryPayload,
    title: 'Audit downstream integrations',
    assigneeEmail: 'integration@example.com',
  };
  const createDependency = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dependencyPayload),
  });
  assert.equal(createDependency.status, 201);
  const dependencyStory = await createDependency.json();
  assert.ok(dependencyStory);

  const blockerPayload = {
    ...primaryPayload,
    title: 'Resolve authentication blockers',
    assigneeEmail: 'security@example.com',
  };
  const createBlocker = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(blockerPayload),
  });
  assert.equal(createBlocker.status, 201);
  const blockerStory = await createBlocker.json();
  assert.ok(blockerStory);

  const linkResponse = await fetch(`${baseUrl}/api/stories/${primaryStory.id}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dependsOnStoryId: dependencyStory.id, relationship: 'depends' }),
  });
  assert.equal(linkResponse.status, 201);
  const linked = await linkResponse.json();
  assert.ok(linked);
  assert.ok(Array.isArray(linked.dependencies));
  assert.ok(linked.dependencies.some((entry) => entry.storyId === dependencyStory.id));

  const blockResponse = await fetch(`${baseUrl}/api/stories/${primaryStory.id}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dependsOnStoryId: blockerStory.id, relationship: 'blocks' }),
  });
  assert.equal(blockResponse.status, 201);
  const blocked = await blockResponse.json();
  assert.ok(blocked);
  assert.ok(Array.isArray(blocked.blockedBy));
  assert.ok(blocked.blockedBy.some((entry) => entry.storyId === blockerStory.id));

  const deleteResponse = await fetch(
    `${baseUrl}/api/stories/${primaryStory.id}/dependencies/${dependencyStory.id}`,
    {
      method: 'DELETE',
    }
  );
  assert.equal(deleteResponse.status, 200);
  const afterDelete = await deleteResponse.json();
  assert.ok(Array.isArray(afterDelete.dependencies));
  assert.ok(afterDelete.dependencies.every((entry) => entry.storyId !== dependencyStory.id));
});

test('story Done status requires completed children and passing tests', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const parentPayload = {
    title: 'Portfolio alignment dashboard',
    description: 'Provide a dashboard for PMO leadership.',
    asA: 'As a portfolio manager',
    iWant: 'I want to review initiative health across components',
    soThat: 'So that I can proactively balance workload and risks',
    components: COMPONENT_CATALOG.length ? [COMPONENT_CATALOG[0]] : ['WorkModel'],
    storyPoint: 5,
    assigneeEmail: 'pmo@example.com',
  };

  const createParentResponse = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parentPayload),
  });
  assert.equal(createParentResponse.status, 201);
  const parentStory = await createParentResponse.json();
  assert.ok(parentStory);

  const blockedResponse = await fetch(`${baseUrl}/api/stories/${parentStory.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...parentPayload,
      status: 'Done',
      acceptWarnings: true,
    }),
  });
  assert.equal(blockedResponse.status, 409);
  const blocked = await blockedResponse.json();
  assert.equal(blocked.code, 'STORY_STATUS_BLOCKED');
  assert.ok(blocked.details);
  assert.equal(typeof blocked.details.missingTests, 'boolean');

  const childPayload = {
    title: 'Audit-ready scorecards',
    description: 'Generate compliance scorecards for each component.',
    asA: 'As an auditor',
    iWant: 'I want to download portfolio scorecards',
    soThat: 'So that regulatory reviews start with trusted baselines',
    components:
      COMPONENT_CATALOG.length > 1 ? [COMPONENT_CATALOG[1]] : [COMPONENT_CATALOG[0]],
    storyPoint: 3,
    assigneeEmail: 'auditor@example.com',
    parentId: parentStory.id,
  };

  const createChildResponse = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(childPayload),
  });
  assert.equal(createChildResponse.status, 201);
  const childStory = await createChildResponse.json();
  assert.ok(childStory);
  assert.ok(Array.isArray(childStory.acceptanceTests));
  assert.ok(childStory.acceptanceTests.length > 0);

  const childTest = childStory.acceptanceTests[0];
  const updateChildTestResponse = await fetch(`${baseUrl}/api/tests/${childTest.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      given: childTest.given,
      when: childTest.when,
      then: childTest.then,
      status: 'Pass',
    }),
  });
  assert.equal(updateChildTestResponse.status, 200);

  const updateChildStoryResponse = await fetch(`${baseUrl}/api/stories/${childStory.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...childPayload,
      status: 'Done',
      acceptWarnings: true,
    }),
  });
  assert.equal(updateChildStoryResponse.status, 200);

  const refreshResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(refreshResponse.status, 200);
  const tree = await refreshResponse.json();
  const flattened = [];
  (function walk(nodes) {
    nodes.forEach((node) => {
      flattened.push(node);
      if (Array.isArray(node.children) && node.children.length) {
        walk(node.children);
      }
    });
  })(tree);

  const refreshedParent = flattened.find((node) => node.id === parentStory.id);
  assert.ok(refreshedParent);
  assert.ok(Array.isArray(refreshedParent.acceptanceTests));
  assert.ok(refreshedParent.acceptanceTests.length > 0);

  const parentTest = refreshedParent.acceptanceTests[0];
  const updateParentTestResponse = await fetch(`${baseUrl}/api/tests/${parentTest.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      given: parentTest.given,
      when: parentTest.when,
      then: parentTest.then,
      status: 'Pass',
    }),
  });
  assert.equal(updateParentTestResponse.status, 200);

  const completeResponse = await fetch(`${baseUrl}/api/stories/${parentStory.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...parentPayload,
      status: 'Done',
      acceptWarnings: true,
    }),
  });
  assert.equal(completeResponse.status, 200);
  const completed = await completeResponse.json();
  assert.equal(completed.status, 'Done');
  assert.ok(completed.acceptanceTests.every((test) => test.status === 'Pass'));
});

test('story health recheck endpoint recalculates INVEST warnings', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  const stories = await storiesResponse.json();
  const story = stories[0];

  const patchResponse = await fetch(`${baseUrl}/api/stories/${story.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: story.title,
      description: story.description,
      asA: '',
      iWant: story.iWant,
      soThat: '',
      acceptWarnings: true,
    }),
  });
  assert.equal(patchResponse.status, 200);

  const recheckResponse = await fetch(`${baseUrl}/api/stories/${story.id}/health-check`, {
    method: 'POST',
  });
  assert.equal(recheckResponse.status, 200);
  const refreshed = await recheckResponse.json();
  assert.equal(refreshed.id, story.id);
  assert.ok(refreshed.investHealth);
  assert.equal(refreshed.investHealth.satisfied, false);
  assert.ok(Array.isArray(refreshed.investWarnings));
  assert.ok(
    refreshed.investWarnings.some(
      (warning) => /persona/i.test(warning.message) || /So that/i.test(warning.message)
    )
  );
  assert.ok(refreshed.investAnalysis);
  assert.ok(['heuristic', 'fallback', 'openai'].includes(refreshed.investAnalysis.source));
});

test('ChatGPT analysis drives INVEST outcome when available', async (t) => {
  await resetDatabaseFiles();
  const previousDisable = process.env.AI_PM_DISABLE_OPENAI;
  const previousKey = process.env.AI_PM_OPENAI_API_KEY;
  process.env.AI_PM_DISABLE_OPENAI = '0';
  process.env.AI_PM_OPENAI_API_KEY = 'test-key';

  const originalFetch = global.fetch;
  const { Response } = globalThis;
  const aiPayload = {
    choices: [
      {
        message: {
          content: JSON.stringify({ summary: 'Story looks ready for delivery.', warnings: [] }),
        },
      },
    ],
  };

  global.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || input?.href;
    if (url && /chat\/completions/.test(url)) {
      try {
        const body = init?.body ? JSON.parse(init.body) : null;
        const systemContent = body?.messages?.[0]?.content || '';
        if (typeof systemContent === 'string' && systemContent.includes('Given/When/Then acceptance tests')) {
          const acceptancePayload = {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: 'Scenario covers login success path.',
                    titleSuffix: 'AI verification',
                    given: ['Given an admin is signed in'],
                    when: ['When they schedule a deployment window'],
                    then: ['Then the schedule is saved within 1 minute and appears on the rollout calendar'],
                  }),
                },
              },
            ],
          };
          return new Response(JSON.stringify(acceptancePayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        // fall through to default payload
      }
      return new Response(JSON.stringify(aiPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };

  const { server, port } = await startServer();

  t.after(async () => {
    if (previousDisable === undefined) {
      delete process.env.AI_PM_DISABLE_OPENAI;
    } else {
      process.env.AI_PM_DISABLE_OPENAI = previousDisable;
    }
    if (previousKey) {
      process.env.AI_PM_OPENAI_API_KEY = previousKey;
    } else {
      delete process.env.AI_PM_OPENAI_API_KEY;
    }
    global.fetch = originalFetch;
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const aiComponents = COMPONENT_CATALOG.slice(1, 3).length
    ? COMPONENT_CATALOG.slice(1, 3)
    : COMPONENT_CATALOG.slice(0, Math.min(2, COMPONENT_CATALOG.length));
  const createResponse = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'AI validated story',
      asA: 'Platform admin',
      iWant: 'configure rollout windows',
      soThat: 'deployments avoid peak hours',
      description: 'Story without acceptance tests to trigger heuristic guidance',
      components: aiComponents,
    }),
  });

  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.investAnalysis.source, 'openai');
  assert.equal(created.investHealth.satisfied, true);
  assert.ok(Array.isArray(created.investAnalysis.fallbackWarnings));
  assert.ok(Array.isArray(created.acceptanceTests));
  assert.ok(created.acceptanceTests.length >= 1);
  assert.deepEqual(created.components, aiComponents);
  assert.ok(
    created.acceptanceTests.every((test) => test.status === 'Draft'),
    'AI reviewed story should still gain a draft acceptance test for verification'
  );
  assert.equal(created.investHealth.issues.length, 0);
});

test('baseline INVEST heuristics flag dependency, negotiable, estimable, and sizing issues', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const warningComponents = COMPONENT_CATALOG.slice(3, 5).length
    ? COMPONENT_CATALOG.slice(3, 5)
    : COMPONENT_CATALOG.slice(0, Math.min(2, COMPONENT_CATALOG.length));
  const warningPayload = {
    title: 'Blocked by analytics overhaul',
    asA: 'Platform PM',
    iWant:
      'deliver a pixel-perfect analytics dashboard that must use Library Y and depends on Story XYZ',
    soThat: 'leadership can review metrics quickly',
    description:
      'Blocked by story 123 and requires story ABC to complete. UI must use library Y with exact 24px spacing; scope spans multiple teams and needs discovery for an unknown API.',
    storyPoint: 13,
    components: warningComponents,
  };

  const warningResponse = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(warningPayload),
  });

  assert.equal(warningResponse.status, 409);
  const warningBody = await warningResponse.json();
  assert.equal(warningBody.code, 'INVEST_WARNINGS');
  assert.ok(Array.isArray(warningBody.warnings));

  const independentIssue = warningBody.warnings.find((issue) => issue.criterion === 'independent');
  assert.ok(independentIssue, 'independent warning expected');
  assert.match(independentIssue.details, /Independent/);

  const negotiableIssue = warningBody.warnings.find((issue) => issue.criterion === 'negotiable');
  assert.ok(negotiableIssue, 'negotiable warning expected');
  assert.match(negotiableIssue.details, /Negotiable/);

  const estimableIssue = warningBody.warnings.find((issue) => issue.criterion === 'estimable');
  assert.ok(estimableIssue, 'estimable warning expected');
  assert.match(estimableIssue.details, /Estimable/);

  const smallIssue = warningBody.warnings.find((issue) => issue.criterion === 'small');
  assert.ok(smallIssue, 'small warning expected');
  assert.match(smallIssue.details, /Small/);

  const testableIssue = warningBody.warnings.find((issue) => issue.criterion === 'testable');
  assert.ok(testableIssue, 'testable warning expected');
  assert.match(testableIssue.details, /Testable/);

  const okResponse = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...warningPayload, acceptWarnings: true }),
  });

  assert.equal(okResponse.status, 201);
  const created = await okResponse.json();
  assert.ok(Array.isArray(created.investHealth.issues));
  assert.ok(created.investHealth.issues.some((issue) => issue.criterion === 'independent'));
});

test('document generation endpoints produce tailored content', async (t) => {
  await resetDatabaseFiles();
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const testDocResponse = await fetch(`${baseUrl}/api/documents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'common-test-document' }),
  });
  assert.equal(testDocResponse.status, 200);
  const testDocContent = await testDocResponse.text();
  assert.match(testDocResponse.headers.get('content-type') || '', /text\/markdown/i);
  assert.ok(/#\s+Common Test Document/i.test(testDocContent));
  assert.ok(/Requirement Traceability Matrix/i.test(testDocContent));
  assert.ok(/Detailed Test Procedures/i.test(testDocContent));
  const testDocSource = testDocResponse.headers.get('x-document-source');
  assert.ok(['fallback', 'baseline', 'openai'].includes(testDocSource));
  const testDisposition = testDocResponse.headers.get('content-disposition') || '';
  assert.ok(/\.md/i.test(testDisposition));

  const systemDocResponse = await fetch(`${baseUrl}/api/documents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'common-requirement-specification' }),
  });
  assert.equal(systemDocResponse.status, 200);
  const systemDocContent = await systemDocResponse.text();
  assert.match(systemDocResponse.headers.get('content-type') || '', /text\/markdown/i);
  assert.ok(/#\s+Common Requirement Specification/i.test(systemDocContent));
  assert.ok(/Requirements Catalogue/i.test(systemDocContent));
  assert.ok(/Requirement Statement/i.test(systemDocContent));
  const systemDocSource = systemDocResponse.headers.get('x-document-source');
  assert.ok(['fallback', 'baseline', 'openai'].includes(systemDocSource));
  const systemDisposition = systemDocResponse.headers.get('content-disposition') || '';
  assert.ok(/\.md/i.test(systemDisposition));

  const badTypeResponse = await fetch(`${baseUrl}/api/documents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'unknown' }),
  });
  assert.equal(badTypeResponse.status, 400);
});

test('acceptance tests can be created when legacy title column exists', async (t) => {
  await resetDatabaseFiles();
  await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
  const db = await openDatabase(DATABASE_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE user_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mr_id INTEGER DEFAULT 1,
      parent_id INTEGER,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      as_a TEXT DEFAULT '',
      i_want TEXT DEFAULT '',
      so_that TEXT DEFAULT '',
      story_point INTEGER,
      assignee_email TEXT DEFAULT '',
      status TEXT DEFAULT 'Draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE acceptance_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      given TEXT NOT NULL,
      when_step TEXT NOT NULL,
      then_step TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE reference_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  db.close();

  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(stories.length > 0);
  const story = stories[0];

  const createResponse = await fetch(`${baseUrl}/api/stories/${story.id}/tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      given: ['a signed-in customer'],
      when: ['they reset their MFA device'],
      then: ['recovery completes within 30 seconds'],
    }),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.deepEqual(created.given, ['a signed-in customer']);
  assert.ok(Object.prototype.hasOwnProperty.call(created, 'title'));
  assert.ok(String(created.title || '').length > 0);
});

test('JSON fallback driver seeds and serves data when forced', async (t) => {
  await resetDatabaseFiles();
  resetDatabaseFactory();
  process.env.AI_PM_FORCE_JSON_DB = '1';

  const { server, port } = await startServer();

  t.after(async () => {
    delete process.env.AI_PM_FORCE_JSON_DB;
    resetDatabaseFactory();
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(Array.isArray(stories));
  assert.ok(stories.length > 0);
  const fileInfo = await fs.readFile(`${DATABASE_PATH}.json`, 'utf8');
  const parsed = JSON.parse(fileInfo);
  assert.equal(parsed.driver, 'json-fallback');
});

test('JSON fallback DELETE statements clear tables when executed via exec', async () => {
  await resetDatabaseFiles();
  resetDatabaseFactory();
  process.env.AI_PM_FORCE_JSON_DB = '1';

  const db = await openDatabase(DATABASE_PATH);
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO user_stories (title, description, as_a, i_want, so_that, components, story_point, assignee_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
  ).run(
    'Fallback delete smoke',
    'Ensures exec DELETE behaves like SQLite',
    'QA lead',
    'verify JSON truncation',
    'we trust mirrored storage',
    JSON.stringify(['WorkModel']),
    2,
    'qa@example.com',
    'Draft',
    now,
    now
  );

  const before = db.prepare('SELECT COUNT(*) as count FROM user_stories').get();
  assert.equal(Number(before.count), 1);

  db.exec(`
    DELETE FROM acceptance_tests;
    DELETE FROM reference_documents;
    DELETE FROM tasks;
    DELETE FROM story_dependencies;
    DELETE FROM user_stories;
  `);

  const after = db.prepare('SELECT COUNT(*) as count FROM user_stories').get();
  assert.equal(Number(after.count), 0);

  db.close?.();
  resetDatabaseFactory();
  delete process.env.AI_PM_FORCE_JSON_DB;

  const snapshot = JSON.parse(await fs.readFile(`${DATABASE_PATH}.json`, 'utf8'));
  assert.equal(snapshot.tables.user_stories.length, 0);
  assert.equal(snapshot.sequences.user_stories, 0);
});

test('story dependency APIs work with JSON fallback database', async (t) => {
  await resetDatabaseFiles();
  resetDatabaseFactory();
  process.env.AI_PM_FORCE_JSON_DB = '1';

  const { server, port } = await startServer();

  t.after(async () => {
    delete process.env.AI_PM_FORCE_JSON_DB;
    resetDatabaseFactory();
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const primaryPayload = {
    title: 'JSON fallback dependency source',
    description: 'Seed story for JSON driver dependency checks.',
    asA: 'As a test harness',
    iWant: 'I want to add dependencies',
    soThat: 'So that fallback storage remains feature complete',
    components: COMPONENT_CATALOG.length ? [COMPONENT_CATALOG[0]] : ['WorkModel'],
    storyPoint: 2,
    assigneeEmail: 'json@example.com',
  };

  const createPrimary = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(primaryPayload),
  });
  assert.equal(createPrimary.status, 201);
  const primaryStory = await createPrimary.json();
  assert.ok(primaryStory);

  const dependencyPayload = { ...primaryPayload, title: 'Fallback dependency target' };
  const createDependency = await fetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dependencyPayload),
  });
  assert.equal(createDependency.status, 201);
  const dependencyStory = await createDependency.json();
  assert.ok(dependencyStory);

  const linkResponse = await fetch(`${baseUrl}/api/stories/${primaryStory.id}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dependsOnStoryId: dependencyStory.id, relationship: 'depends' }),
  });
  assert.equal(linkResponse.status, 201);
  const linked = await linkResponse.json();
  assert.ok(Array.isArray(linked.dependencies));
  assert.ok(linked.dependencies.some((entry) => entry.storyId === dependencyStory.id));

  const deleteResponse = await fetch(
    `${baseUrl}/api/stories/${primaryStory.id}/dependencies/${dependencyStory.id}`,
    { method: 'DELETE' }
  );
  assert.equal(deleteResponse.status, 200);
  const afterDelete = await deleteResponse.json();
  assert.ok(Array.isArray(afterDelete.dependencies));
  assert.ok(afterDelete.dependencies.every((entry) => entry.storyId !== dependencyStory.id));
});

test('Codex delegation uses built-in service when remote is unavailable', async (t) => {
  await resetDatabaseFiles();
  process.env.CODEX_DEFAULT_REPOSITORY_URL = 'https://api.github.com/repos/demian7575/aipm';
  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });
  t.after(() => {
    delete process.env.CODEX_DEFAULT_REPOSITORY_URL;
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(Array.isArray(stories));
  assert.ok(stories.length > 0, 'Sample dataset should include at least one story');
  const story = stories[0];

  const delegateResponse = await fetch(`${baseUrl}/api/stories/${story.id}/codex/delegate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repositoryUrl: '',
      plan: 'personal-plus',
      branch: '',
      codexUserEmail: 'delegate@example.com',
      instructions: 'Implement the story end-to-end using the embedded workflow.',
      additionalContext: 'Integration test execution',
    }),
  });

  assert.equal(delegateResponse.status, 200);
  const delegationBody = await delegateResponse.json();
  assert.ok(delegationBody.delegation);
  assert.equal(delegationBody.delegation.source, 'builtin');
  assert.ok(delegationBody.delegation.id.startsWith('builtin-'));
  assert.equal(
    delegationBody.delegation.repositoryUrl,
    'https://api.github.com/repos/demian7575/aipm',
    'Fallback repository URL should be applied when none is provided',
  );
  assert.equal(delegationBody.delegation.branch, 'main');
  assert.equal(delegationBody.delegation.plan, 'Personal Plus');
  assert.ok(delegationBody.delegation.prUrl.includes('/pull/'));

  assert.ok(Array.isArray(delegationBody.tasks));
  assert.equal(
    delegationBody.tasks.length,
    2,
    'Delegation should create an execution task and a PR tracking task',
  );
  const taskTitles = delegationBody.tasks.map((task) => task.title);
  assert.ok(taskTitles.some((title) => title.includes('Develop with Codex')));
  assert.ok(taskTitles.some((title) => title.includes('Codex PR')));

  const refreshedStoriesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(refreshedStoriesResponse.status, 200);
  const refreshedStories = await refreshedStoriesResponse.json();
  assert.ok(Array.isArray(refreshedStories));
  const refreshedStory = refreshedStories.find((item) => item.id === story.id);
  assert.ok(refreshedStory, 'Story should still be retrievable after delegation');
  assert.ok(Array.isArray(refreshedStory.tasks));
  assert.ok(
    refreshedStory.tasks.some((task) => task.title.includes('Develop with Codex')),
    'Story payload should include Codex execution task',
  );
  assert.ok(
    refreshedStory.tasks.some((task) => task.title.includes('Codex PR')),
    'Story payload should include Codex PR tracking task',
  );

  const listResponse = await fetch(`${baseUrl}/api/codex/delegations`);
  assert.equal(listResponse.status, 200);
  const delegations = await listResponse.json();
  assert.ok(Array.isArray(delegations));
  const storedDelegation = delegations.find(
    (item) => item && item.id === delegationBody.delegation.id
  );
  assert.ok(storedDelegation, 'Delegation should be stored in built-in service ledger');
  assert.equal(storedDelegation.status, 'Queued');

  const updateResponse = await fetch(
    `${baseUrl}/api/codex/delegations/${encodeURIComponent(delegationBody.delegation.id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'In Progress',
        appendEvent: { type: 'progress', message: 'Agent picked up the work' },
      }),
    }
  );
  assert.equal(updateResponse.status, 200);
  const updatedDelegation = await updateResponse.json();
  assert.equal(updatedDelegation.status, 'In Progress');
  assert.ok(Array.isArray(updatedDelegation.events));
  assert.ok(
    updatedDelegation.events.some((event) => event && event.type === 'progress'),
    'Delegation update should record a progress event',
  );

  const getResponse = await fetch(
    `${baseUrl}/api/codex/delegations/${encodeURIComponent(delegationBody.delegation.id)}`
  );
  assert.equal(getResponse.status, 200);
  const fetchedDelegation = await getResponse.json();
  assert.equal(fetchedDelegation.status, 'In Progress');
  assert.ok(
    fetchedDelegation.events.some((event) => event && event.type === 'progress'),
    'Delegation fetch should include updated events',
  );
});

test('Codex delegation syncs with ChatGPT Codex when configured', async (t) => {
  await resetDatabaseFiles();
  process.env.CODEX_DEFAULT_REPOSITORY_URL = 'https://api.github.com/repos/demian7575/aipm';
  process.env.CODEX_CHATGPT_AUTH_TOKEN = 'test-token';
  process.env.CODEX_CHATGPT_TASKS_URL = 'https://chatgpt.example/api/tasks';

  const originalFetch = globalThis.fetch;
  const capturedRequests = [];
  globalThis.fetch = async (url, options) => {
    if (String(url) === process.env.CODEX_CHATGPT_TASKS_URL) {
      capturedRequests.push({ url: String(url), options });
      return new Response(
        JSON.stringify({
          id: 'chatgpt-task-42',
          url: 'https://chatgpt.com/codex/tasks/42',
          status: 'Queued',
          summary: 'ChatGPT Codex task created',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    return originalFetch(url, options);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.CODEX_CHATGPT_AUTH_TOKEN;
    delete process.env.CODEX_CHATGPT_TASKS_URL;
    delete process.env.CODEX_CHATGPT_REQUIRE_SUCCESS;
    delete process.env.CODEX_DEFAULT_REPOSITORY_URL;
  });

  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(Array.isArray(stories));
  assert.ok(stories.length > 0);
  const story = stories[0];

  const delegateResponse = await fetch(`${baseUrl}/api/stories/${story.id}/codex/delegate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repositoryUrl: '',
      plan: 'personal-plus',
      branch: '',
      codexUserEmail: 'delegate@example.com',
      instructions: 'Implement via ChatGPT Codex integration.',
      additionalContext: 'Integration test execution',
    }),
  });

  assert.equal(delegateResponse.status, 200);
  const delegationBody = await delegateResponse.json();
  assert.equal(delegationBody.delegation.source, 'chatgpt');
  assert.ok(delegationBody.delegation.metadata?.chatgptTask);
  assert.equal(
    delegationBody.delegation.metadata.chatgptTask.url,
    'https://chatgpt.com/codex/tasks/42',
  );
  assert.equal(delegationBody.delegation.metadata.chatgptTask.status, 'Queued');
  assert.ok(Array.isArray(delegationBody.tasks));
  assert.ok(
    delegationBody.tasks.some((task) =>
      typeof task.description === 'string' && task.description.includes('ChatGPT Codex task'),
    ),
    'Execution task should reference ChatGPT Codex task URL',
  );

  assert.equal(capturedRequests.length, 1);
  const captured = capturedRequests[0];
  assert.equal(captured.options?.method, 'POST');
  assert.equal(captured.options?.headers?.Authorization, 'Bearer test-token');

  const ledgerResponse = await fetch(`${baseUrl}/api/codex/delegations`);
  assert.equal(ledgerResponse.status, 200);
  const ledger = await ledgerResponse.json();
  const storedDelegation = ledger.find((entry) => entry && entry.id === delegationBody.delegation.id);
  assert.ok(storedDelegation, 'Delegation should be written to ledger');
  assert.equal(storedDelegation.chatgptTaskId, 'chatgpt-task-42');
  assert.equal(storedDelegation.chatgptTaskUrl, 'https://chatgpt.com/codex/tasks/42');
  assert.equal(storedDelegation.chatgptTaskStatus, 'Queued');
  assert.ok(
    Array.isArray(storedDelegation.events) &&
      storedDelegation.events.some((event) => event && event.type === 'chatgpt-sync'),
    'Ledger should include ChatGPT sync event',
  );
});

test('Codex delegation tolerates non-JSON ChatGPT Codex responses', async (t) => {
  await resetDatabaseFiles();
  process.env.CODEX_DEFAULT_REPOSITORY_URL = 'https://api.github.com/repos/demian7575/aipm';
  process.env.CODEX_CHATGPT_AUTH_TOKEN = 'test-token';
  process.env.CODEX_CHATGPT_TASKS_URL = 'https://chatgpt.example/api/tasks';

  const originalFetch = globalThis.fetch;
  const capturedRequests = [];
  globalThis.fetch = async (url, options) => {
    if (String(url) === process.env.CODEX_CHATGPT_TASKS_URL) {
      capturedRequests.push({ url: String(url), options });
      return new Response('Task created successfully', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    return originalFetch(url, options);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.CODEX_CHATGPT_AUTH_TOKEN;
    delete process.env.CODEX_CHATGPT_TASKS_URL;
    delete process.env.CODEX_CHATGPT_REQUIRE_SUCCESS;
    delete process.env.CODEX_DEFAULT_REPOSITORY_URL;
  });

  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(Array.isArray(stories));
  assert.ok(stories.length > 0);
  const story = stories[0];

  const delegateResponse = await fetch(`${baseUrl}/api/stories/${story.id}/codex/delegate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repositoryUrl: '',
      plan: 'personal-plus',
      branch: '',
      codexUserEmail: 'delegate@example.com',
      instructions: 'Implement via ChatGPT Codex integration.',
      additionalContext: 'Text response integration test',
    }),
  });

  assert.equal(delegateResponse.status, 200);
  const delegationBody = await delegateResponse.json();
  assert.equal(delegationBody.delegation.source, 'chatgpt');
  assert.ok(delegationBody.delegation.metadata?.chatgptTask);
  assert.equal(delegationBody.delegation.metadata.chatgptTask.status, 'Queued');
  assert.ok(
    Array.isArray(delegationBody.tasks) &&
      delegationBody.tasks.some((task) =>
        typeof task.description === 'string' &&
        task.description.includes('ChatGPT Codex status: Queued'),
      ),
    'Execution task should surface ChatGPT Codex status even when response is plain text',
  );
  assert.ok(capturedRequests.length > 0);
  assert.equal(capturedRequests[0].options?.headers?.Authorization, 'Bearer test-token');

  const ledgerResponse = await fetch(`${baseUrl}/api/codex/delegations`);
  assert.equal(ledgerResponse.status, 200);
  const ledger = await ledgerResponse.json();
  const storedDelegation = ledger.find((entry) => entry && entry.id === delegationBody.delegation.id);
  assert.ok(storedDelegation, 'Delegation should be written to ledger');
  assert.equal(storedDelegation.chatgptTaskStatus, 'Queued');
  assert.equal(storedDelegation.summary, 'Task created successfully');
  assert.ok(
    Array.isArray(storedDelegation.events) &&
      storedDelegation.events.some((event) => event && event.type === 'chatgpt-sync'),
    'Ledger should include ChatGPT sync event',
  );
});

test('Codex delegation surfaces ChatGPT error responses when require success is enabled', async (t) => {
  await resetDatabaseFiles();
  process.env.CODEX_DEFAULT_REPOSITORY_URL = 'https://api.github.com/repos/demian7575/aipm';
  process.env.CODEX_CHATGPT_AUTH_TOKEN = 'test-token';
  process.env.CODEX_CHATGPT_TASKS_URL = 'https://chatgpt.example/api/tasks';
  process.env.CODEX_CHATGPT_REQUIRE_SUCCESS = '1';

  const originalFetch = globalThis.fetch;
  const capturedRequests = [];
  globalThis.fetch = async (url, options) => {
    if (String(url) === process.env.CODEX_CHATGPT_TASKS_URL) {
      capturedRequests.push({ url: String(url), options });
      return new Response('Upstream maintenance', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    return originalFetch(url, options);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.CODEX_CHATGPT_AUTH_TOKEN;
    delete process.env.CODEX_CHATGPT_TASKS_URL;
    delete process.env.CODEX_CHATGPT_REQUIRE_SUCCESS;
    delete process.env.CODEX_DEFAULT_REPOSITORY_URL;
  });

  const { server, port } = await startServer();

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const storiesResponse = await fetch(`${baseUrl}/api/stories`);
  assert.equal(storiesResponse.status, 200);
  const stories = await storiesResponse.json();
  assert.ok(Array.isArray(stories));
  assert.ok(stories.length > 0);
  const story = stories[0];

  const delegateResponse = await fetch(`${baseUrl}/api/stories/${story.id}/codex/delegate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repositoryUrl: '',
      plan: 'personal-plus',
      branch: '',
      codexUserEmail: 'delegate@example.com',
      instructions: 'Implement via ChatGPT Codex integration.',
      additionalContext: 'Error propagation integration test',
    }),
  });

  assert.equal(delegateResponse.status, 503);
  const errorBody = await delegateResponse.json();
  assert.equal(errorBody?.message, 'Upstream maintenance');

  assert.equal(capturedRequests.length, 1);
  assert.equal(capturedRequests[0].options?.headers?.Authorization, 'Bearer test-token');
});

test('sample dataset generator produces 50 stories and mirrored acceptance tests', async () => {
  const outputPath = path.join(process.cwd(), 'docs', 'examples', 'generated-sample.sqlite');
  await fs.rm(outputPath, { force: true });
  await fs.rm(`${outputPath}.json`, { force: true });

  const summary = await generateSampleDataset(outputPath);
  assert.equal(summary.storyCount, 50);
  assert.ok(
    summary.acceptanceTestCount >= 50,
    'Sample dataset should include at least one acceptance test per story'
  );

  const db = await openDatabase(outputPath);
  const storyCountRow = db.prepare('SELECT COUNT(*) AS count FROM user_stories').get();
  const testCountRow = db.prepare('SELECT COUNT(*) AS count FROM acceptance_tests').get();
  db.close?.();
  resetDatabaseFactory();

  assert.equal(Number(storyCountRow.count), 50);
  assert.equal(Number(testCountRow.count), summary.acceptanceTestCount);

  await fs.rm(outputPath, { force: true });
  await fs.rm(`${outputPath}.json`, { force: true });
});
