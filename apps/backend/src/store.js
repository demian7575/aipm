import { randomUUID } from 'node:crypto';
import {
  createStory as sharedCreateStory,
  createAcceptanceTest as sharedCreateAcceptanceTest,
  rollupStatus,
  validateStoryInvest,
  validateAcceptanceTest
} from '@ai-pm/shared';
import { execStatements, queryRows } from './db.js';
import { INVEST_POLICY, MAX_DEPTH } from './config.js';

const nowIso = () => new Date().toISOString();

const clone = (value) => JSON.parse(JSON.stringify(value));

const ensure = (condition, code, message, details) => {
  if (!condition) {
    const error = new Error(message);
    error.code = code;
    if (details !== undefined) error.details = details;
    throw error;
  }
};

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const jsonQuote = (value) => quote(JSON.stringify(value));
const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const INVEST_LABELS = {
  independent: 'Independent',
  negotiable: 'Negotiable',
  valuable: 'Valuable',
  estimable: 'Estimable',
  small: 'Small',
  testable: 'Testable'
};

const summarizeInvestResult = (result) => {
  const violations = Object.entries(result.principles ?? {})
    .filter(([, value]) => !value.ok)
    .map(([principle, value]) => ({
      principle,
      label: INVEST_LABELS[principle] ?? principle,
      message: value.message ?? `Adjust the story to satisfy the ${INVEST_LABELS[principle] ?? principle} criterion.`,
      suggestion: value.message ?? `Adjust the story to satisfy the ${INVEST_LABELS[principle] ?? principle} criterion.`
    }));

  const summary =
    violations.length === 0
      ? 'Story satisfies INVEST.'
      : `Story fails INVEST validation: ${violations
          .map((violation) => `${violation.label} – ${violation.message}`)
          .join('; ')}`;

  return { summary, violations };
};

const summarizeMeasurabilityResult = (result) => {
  if (!result || result.ok) {
    return { summary: 'Then steps are measurable.', issues: [], examples: [] };
  }

  const issues = result.offending.map((item) => {
    const examples = Array.isArray(item.examples) ? item.examples : [];
    return {
      index: item.index,
      text: item.text,
      criteria: 'Then step must describe a measurable, verifiable outcome.',
      suggestion:
        item.guidance ??
        'Add a concrete verification such as a time limit, numeric threshold, percentage, or explicit field to this Then step.',
      examples
    };
  });

  const summaryPrefix = 'Acceptance test measurability failed';
  const summarySuffix =
    issues.length === 0
      ? ' – add measurable outcomes to the Then steps.'
      : ` – ${issues
          .map((issue) => {
            const exampleHint = issue.examples && issue.examples.length > 0
              ? ` Try values such as ${issue.examples.slice(0, 3).join(', ')}.`
              : '';
            return `step ${issue.index + 1} "${issue.text}" lacks a measurable target.${exampleHint}`;
          })
          .join(' ')} `;

  const aggregatedExamples = Array.from(
    new Set(
      issues
        .flatMap((issue) => issue.examples ?? [])
        .slice(0, 5)
    )
  );

  return {
    summary: `${summaryPrefix}${summarySuffix.trim()}`,
    issues,
    examples: aggregatedExamples
  };
};

const isDescendant = (stories, candidateId, parentId) => {
  const visited = new Set();
  const stack = [candidateId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    if (current === parentId) return true;
    visited.add(current);
    stories
      .filter((story) => story.parentId === current)
      .forEach((child) => stack.push(child.id));
  }
  return false;
};

export class InMemoryStore {
  constructor() {
    this.mergeRequests = new Map();
    this.stories = new Map();
    this.tests = new Map();
    this.#loadFromDb();
  }

  reset() {
    this.mergeRequests.clear();
    this.stories.clear();
    this.tests.clear();
    execStatements(['BEGIN;', 'DELETE FROM tests;', 'DELETE FROM stories;', 'DELETE FROM merge_requests;', 'COMMIT;']);
  }

  seed() {
    this.reset();
    const now = nowIso();
    const mrId = randomUUID();
    const mr = {
      id: mrId,
      title: 'MR:XXXX',
      summary: 'Initial AI PM mindmap seed merge request',
      status: 'Draft',
      branch: 'feature/ai-mindmap',
      drift: true,
      lastSyncAt: now,
      storyIds: [],
      createdAt: now,
      updatedAt: now,
      version: 0
    };
    this.mergeRequests.set(mr.id, mr);

    const root1 = this.#createStoryInternal({
      mrId: mr.id,
      title: 'US1 Mindmap shell',
      asA: 'As an AI PM',
      iWant: 'I want a collaborative planning canvas',
      soThat: 'I can align the team quickly'
    });
    const root2 = this.#createStoryInternal({
      mrId: mr.id,
      order: 1,
      title: 'US2 Outline interaction',
      asA: 'As a reviewer',
      iWant: 'I want to audit the outline efficiently',
      soThat: 'I can approve plans faster'
    });
    const child1 = this.#createStoryInternal({
      mrId: mr.id,
      parentId: root1.id,
      depth: 1,
      title: 'US1-1 Render nodes',
      asA: 'As a user',
      iWant: 'I want to visualize nodes',
      soThat: 'I understand the plan'
    });
    const child2 = this.#createStoryInternal({
      mrId: mr.id,
      parentId: root1.id,
      order: 1,
      depth: 1,
      title: 'US1-2 Validate INVEST quickly',
      asA: 'As a planner',
      iWant: 'I want automated INVEST checks',
      soThat: 'I can spot issues'
    });
    const child3 = this.#createStoryInternal({
      mrId: mr.id,
      parentId: root1.id,
      order: 2,
      depth: 1,
      title: 'US1-3 Provide mindmap layout',
      asA: 'As a developer',
      iWant: 'I want radial layout guidance',
      soThat: 'I ship faster'
    });
    const failingInvest = this.#createStoryInternal({
      mrId: mr.id,
      parentId: root2.id,
      title: 'US2-1 Combine many tasks and must have',
      asA: 'As a stakeholder',
      iWant: 'I want everything and must deliver',
      soThat: 'It is optimal and fast'
    });
    const ambiguousStory = this.#createStoryInternal({
      mrId: mr.id,
      parentId: root2.id,
      order: 1,
      title: 'US2-2 Ambiguous acceptance',
      asA: 'As QA',
      iWant: 'I want steps defined',
      soThat: 'We can validate appropriately'
    });

    const stories = [root1, root2, child1, child2, child3, failingInvest, ambiguousStory];
    stories.forEach((story) => {
      this.stories.set(story.id, story);
    });
    mr.storyIds = [root1.id, root2.id];

    const passTest = this.#createAcceptanceTestInternal(child1.id);
    passTest.status = 'Pass';
    const warnTest = this.#createAcceptanceTestInternal(child2.id);
    warnTest.then = ['User sees INVEST warning within 2 seconds'];
    warnTest.status = 'Ready';
    const failTest = this.#createAcceptanceTestInternal(failingInvest.id);
    failTest.status = 'Fail';
    const ambiguousTest = this.#createAcceptanceTestInternal(ambiguousStory.id);
    ambiguousTest.then = ['The system responds 빠르게 and optimally'];
    const ambiguousCheck = validateAcceptanceTest(ambiguousTest);
    ambiguousTest.ambiguityFlags = ambiguousCheck.ambiguity.issues.map((issue) => issue.term);

    [passTest, warnTest, failTest, ambiguousTest].forEach((test) => {
      this.tests.set(test.id, test);
      const story = this.stories.get(test.storyId);
      story.testIds.push(test.id);
    });

    this.#refreshChildren();
    stories.forEach((story) => this.#recalculateInvest(story.id));
    this.#persistAll();
  }

  seedIfEmpty() {
    if (this.mergeRequests.size > 0) {
      return;
    }

    let existing = 0;
    try {
      const [row] = queryRows('SELECT COUNT(*) as count FROM merge_requests');
      existing = Number(row?.count ?? row?.['COUNT(*)'] ?? 0);
    } catch (error) {
      existing = 0;
    }

    if (existing > 0) {
      this.#loadFromDb();
      return;
    }

    this.seed();
  }

  #refreshChildren() {
    this.stories.forEach((story) => {
      story.childrenIds = [];
    });
    this.stories.forEach((story) => {
      if (story.parentId) {
        const parent = this.stories.get(story.parentId);
        if (parent) parent.childrenIds.push(story.id);
      }
    });
  }

  #loadFromDb() {
    try {
      const tables = queryRows("SELECT name FROM sqlite_master WHERE type='table'");
      const names = new Set(tables.map((row) => row.name));
      if (!names.has('merge_requests') || !names.has('stories') || !names.has('tests')) {
        return;
      }
    } catch (error) {
      return;
    }

    this.mergeRequests.clear();
    this.stories.clear();
    this.tests.clear();

    const mergeRequests = queryRows('SELECT * FROM merge_requests');
    mergeRequests.forEach((row) => {
      const mr = {
        id: row.id,
        title: row.title,
        summary: row.summary,
        status: row.status,
        branch: row.branch,
        drift: Boolean(row.drift),
        lastSyncAt: row.lastSyncAt,
        storyIds: parseJson(row.storyIds, []),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        version: row.version
      };
      this.mergeRequests.set(mr.id, mr);
    });

    const stories = queryRows('SELECT * FROM stories');
    stories.forEach((row) => {
      const story = {
        id: row.id,
        mrId: row.mrId,
        parentId: row.parentId ?? null,
        order: row.order,
        depth: row.depth,
        title: row.title,
        asA: row.asA,
        iWant: row.iWant,
        soThat: row.soThat,
        invest: parseJson(row.invest, {}),
        childrenIds: parseJson(row.childrenIds, []),
        testIds: parseJson(row.testIds, []),
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        version: row.version
      };
      this.stories.set(story.id, story);
    });

    const tests = queryRows('SELECT * FROM tests');
    tests.forEach((row) => {
      const test = {
        id: row.id,
        storyId: row.storyId,
        given: parseJson(row.given, []),
        when: parseJson(row.when, []),
        then: parseJson(row.then, []),
        ambiguityFlags: parseJson(row.ambiguityFlags, []),
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        version: row.version
      };
      this.tests.set(test.id, test);
    });
    this.#refreshChildren();
    this.stories.forEach((story) => this.#recalculateInvest(story.id));
  }

  #persistAll() {
    const statements = ['BEGIN;', 'DELETE FROM tests;', 'DELETE FROM stories;', 'DELETE FROM merge_requests;'];
    this.mergeRequests.forEach((mr) => {
      statements.push(
        `INSERT INTO merge_requests (id, title, summary, status, branch, drift, lastSyncAt, storyIds, createdAt, updatedAt, version) VALUES (${quote(
          mr.id
        )}, ${quote(mr.title)}, ${quote(mr.summary)}, ${quote(mr.status)}, ${quote(mr.branch)}, ${mr.drift ? 1 : 0}, ${quote(
          mr.lastSyncAt
        )}, ${jsonQuote(mr.storyIds)}, ${quote(mr.createdAt)}, ${quote(mr.updatedAt)}, ${mr.version});`
      );
    });
    this.stories.forEach((story) => {
      statements.push(
        `INSERT INTO stories (id, mrId, parentId, "order", depth, title, asA, iWant, soThat, invest, childrenIds, testIds, status, createdAt, updatedAt, version) VALUES (${quote(
          story.id
        )}, ${quote(story.mrId)}, ${story.parentId ? quote(story.parentId) : 'NULL'}, ${story.order}, ${story.depth}, ${quote(
          story.title
        )}, ${quote(story.asA)}, ${quote(story.iWant)}, ${quote(story.soThat)}, ${jsonQuote(story.invest)}, ${jsonQuote(
          story.childrenIds
        )}, ${jsonQuote(story.testIds)}, ${quote(story.status)}, ${quote(story.createdAt)}, ${quote(story.updatedAt)}, ${story.version});`
      );
    });
    this.tests.forEach((test) => {
      statements.push(
        `INSERT INTO tests (id, storyId, "given", "when", "then", ambiguityFlags, status, createdAt, updatedAt, version) VALUES (${quote(
          test.id
        )}, ${quote(test.storyId)}, ${jsonQuote(test.given)}, ${jsonQuote(test.when)}, ${jsonQuote(test.then)}, ${jsonQuote(
          test.ambiguityFlags
        )}, ${quote(test.status)}, ${quote(test.createdAt)}, ${quote(test.updatedAt)}, ${test.version});`
      );
    });
    statements.push('COMMIT;');
    execStatements(statements);
  }

  #deleteStoryRecursive(id) {
    const story = this.stories.get(id);
    ensure(story, 'story.notFound', 'Story not found');
    const children = Array.from(this.stories.values()).filter((candidate) => candidate.parentId === id);
    children.forEach((child) => this.#deleteStoryRecursive(child.id));
    story.testIds.forEach((testId) => this.tests.delete(testId));
    if (story.parentId) {
      const parent = this.stories.get(story.parentId);
      if (parent) {
        parent.childrenIds = parent.childrenIds.filter((childId) => childId !== id);
        this.#syncOrdersForParent(story.mrId, story.parentId);
        this.#recalculateInvest(parent.id);
      }
    } else {
      const mr = this.mergeRequests.get(story.mrId);
      if (mr) {
        mr.storyIds = mr.storyIds.filter((storyId) => storyId !== id);
        this.#syncOrdersForParent(story.mrId, null);
      }
    }
    this.stories.delete(id);
  }

  getState() {
    return {
      mergeRequests: Array.from(this.mergeRequests.values()).map(clone),
      stories: Array.from(this.stories.values()).map(clone),
      tests: Array.from(this.tests.values()).map(clone)
    };
  }

  listMergeRequests() {
    return Array.from(this.mergeRequests.values()).map(clone);
  }

  getMergeRequest(id) {
    const mr = this.mergeRequests.get(id);
    ensure(mr, 'mergeRequest.notFound', 'Merge request not found');
    return clone(mr);
  }

  createMergeRequest(payload) {
    ensure(typeof payload.title === 'string' && payload.title.length > 0, 'mergeRequest.invalid', 'Title is required');
    ensure(payload.title.length <= 120, 'mergeRequest.invalid', 'Title must be 120 characters or fewer');
    ensure(typeof payload.summary === 'string', 'mergeRequest.invalid', 'Summary is required');
    ensure(payload.summary.length <= 500, 'mergeRequest.invalid', 'Summary must be 500 characters or fewer');

    const now = nowIso();
    const mr = {
      id: randomUUID(),
      title: payload.title,
      summary: payload.summary ?? '',
      status: 'Draft',
      branch: payload.branch ?? 'feature/new-work',
      drift: payload.drift ?? false,
      lastSyncAt: now,
      storyIds: [],
      createdAt: now,
      updatedAt: now,
      version: 0
    };
    this.mergeRequests.set(mr.id, mr);
    this.#persistAll();
    return clone(mr);
  }

  updateMergeRequest(id, patch) {
    const mr = this.mergeRequests.get(id);
    ensure(mr, 'mergeRequest.notFound', 'Merge request not found');
    if (patch.title !== undefined) {
      ensure(typeof patch.title === 'string' && patch.title.length > 0, 'mergeRequest.invalid', 'Title must be provided');
      ensure(patch.title.length <= 120, 'mergeRequest.invalid', 'Title must be 120 characters or fewer');
      mr.title = patch.title;
    }
    if (patch.summary !== undefined) {
      ensure(typeof patch.summary === 'string', 'mergeRequest.invalid', 'Summary must be a string');
      ensure(patch.summary.length <= 500, 'mergeRequest.invalid', 'Summary must be 500 characters or fewer');
      mr.summary = patch.summary;
    }
    if (patch.branch !== undefined) {
      ensure(typeof patch.branch === 'string', 'mergeRequest.invalid', 'Branch must be a string');
      mr.branch = patch.branch;
    }
    if (patch.drift !== undefined) {
      ensure(typeof patch.drift === 'boolean', 'mergeRequest.invalid', 'Drift must be a boolean');
      mr.drift = patch.drift;
    }
    mr.updatedAt = nowIso();
    mr.version += 1;
    this.#persistAll();
    return clone(mr);
  }

  setMergeRequestStatus(id, status) {
    const allowed = ['Draft', 'Ready', 'InReview', 'Merged', 'Closed'];
    ensure(allowed.includes(status), 'mergeRequest.invalid', 'Status is invalid');
    const mr = this.mergeRequests.get(id);
    ensure(mr, 'mergeRequest.notFound', 'Merge request not found');
    mr.status = status;
    mr.updatedAt = nowIso();
    mr.version += 1;
    this.#persistAll();
    return clone(mr);
  }

  updateBranch(id) {
    const mr = this.mergeRequests.get(id);
    ensure(mr, 'mergeRequest.notFound', 'Merge request not found');
    mr.drift = !mr.drift;
    mr.lastSyncAt = nowIso();
    mr.updatedAt = mr.lastSyncAt;
    mr.version += 1;
    this.#persistAll();
    return clone(mr);
  }

  deleteMergeRequest(id) {
    const mr = this.mergeRequests.get(id);
    ensure(mr, 'mergeRequest.notFound', 'Merge request not found');
    const stories = this.listStories({ mrId: id });
    stories.forEach((story) => {
      this.stories.delete(story.id);
      story.testIds.forEach((testId) => this.tests.delete(testId));
    });
    this.mergeRequests.delete(id);
    this.#persistAll();
    return { ok: true };
  }

  listStories({ mrId } = {}) {
    const stories = Array.from(this.stories.values()).filter((story) => (mrId ? story.mrId === mrId : true));
    return stories.map(clone);
  }

  getStory(id) {
    const story = this.stories.get(id);
    ensure(story, 'story.notFound', 'Story not found');
    return clone(story);
  }

  #createStoryInternal(input) {
    const parent = input.parentId ? this.stories.get(input.parentId) : null;
    const order = input.order ?? (parent ? parent.childrenIds.length : (this.mergeRequests.get(input.mrId)?.storyIds.length ?? 0));
    const depth = input.parentId
      ? parent
        ? parent.depth + 1
        : input.depth ?? 0
      : 0;
    const story = sharedCreateStory({
      mrId: input.mrId,
      parentId: input.parentId ?? null,
      order,
      depth,
      title: input.title,
      asA: input.asA,
      iWant: input.iWant,
      soThat: input.soThat
    });
    return story;
  }

  createStory(payload) {
    const mr = this.mergeRequests.get(payload.mrId);
    ensure(mr, 'mergeRequest.notFound', 'Parent merge request not found');
    if (payload.parentId) {
      const parent = this.stories.get(payload.parentId);
      ensure(parent, 'story.parentMissing', 'Parent story not found');
      ensure(parent.depth + 1 <= MAX_DEPTH, 'story.depthExceeded', `Maximum depth ${MAX_DEPTH} exceeded`);
    }

    const story = this.#createStoryInternal(payload);
    const storyList = [...Array.from(this.stories.values()).filter((s) => s.mrId === payload.mrId), story];
    const validation = validateStoryInvest(story, { stories: storyList, tests: Array.from(this.tests.values()) });
    const investSummary = summarizeInvestResult(validation);
    const blocking = investSummary.violations.filter((item) => item.principle !== 'testable');
    ensure(blocking.length === 0, 'story.invest', investSummary.summary, {
      ...validation,
      violations: investSummary.violations
    });

    this.stories.set(story.id, story);
    if (story.parentId) {
      const parent = this.stories.get(story.parentId);
      const targetIndex = payload.order ?? parent.childrenIds.length;
      parent.childrenIds.splice(targetIndex, 0, story.id);
      story.order = targetIndex;
      this.#syncOrdersForParent(story.mrId, story.parentId);
      this.#recalculateInvest(parent.id);
    } else {
      const targetIndex = payload.order ?? mr.storyIds.length;
      mr.storyIds.splice(targetIndex, 0, story.id);
      story.order = targetIndex;
      this.#syncOrdersForParent(story.mrId, null);
    }
    mr.updatedAt = nowIso();
    mr.version += 1;
    this.#applyInvestResult(story, validation);
    this.#persistAll();
    return clone(story);
  }

  updateStory(id, patch) {
    const story = this.stories.get(id);
    ensure(story, 'story.notFound', 'Story not found');

    if (patch.title !== undefined) {
      ensure(typeof patch.title === 'string' && patch.title.length > 0, 'story.invalid', 'Title required');
      story.title = patch.title;
    }
    if (patch.asA !== undefined) {
      ensure(typeof patch.asA === 'string' && patch.asA.length > 0, 'story.invalid', 'As a required');
      story.asA = patch.asA;
    }
    if (patch.iWant !== undefined) {
      ensure(typeof patch.iWant === 'string' && patch.iWant.length > 0, 'story.invalid', 'I want required');
      story.iWant = patch.iWant;
    }
    if (patch.soThat !== undefined) {
      ensure(typeof patch.soThat === 'string' && patch.soThat.length > 0, 'story.invalid', 'So that required');
      story.soThat = patch.soThat;
    }

    story.updatedAt = nowIso();
    story.version += 1;

    const contextStories = Array.from(this.stories.values()).filter((s) => s.mrId === story.mrId);
    const contextTests = Array.from(this.tests.values());
    const policy = validateStoryInvest(story, { stories: contextStories, tests: contextTests });
    const investSummary = summarizeInvestResult(policy);
    ensure(policy.ok || INVEST_POLICY === 'warn', 'story.invest', investSummary.summary, {
      ...policy,
      violations: investSummary.violations
    });
    this.#applyInvestResult(story, policy);
    this.#persistAll();
    return clone(story);
  }

  setStoryStatus(id, status) {
    const allowed = ['Draft', 'Ready', 'Approved'];
    ensure(allowed.includes(status), 'story.invalid', 'Story status invalid');
    const story = this.stories.get(id);
    ensure(story, 'story.notFound', 'Story not found');
    story.status = status;
    story.updatedAt = nowIso();
    story.version += 1;
    this.#persistAll();
    return clone(story);
  }

  deleteStory(id) {
    this.#deleteStoryRecursive(id);
    this.#persistAll();
    return { ok: true };
  }

  moveStory(id, { parentId, index }) {
    const story = this.stories.get(id);
    ensure(story, 'story.notFound', 'Story not found');
    if (parentId === story.parentId && index === story.order) {
      return clone(story);
    }

    if (parentId) {
      ensure(this.stories.has(parentId), 'story.parentMissing', 'Parent story not found');
      ensure(!isDescendant(this.listStories(), parentId, story.id), 'story.cycle', 'Cannot move story into its descendant');
      const parent = this.stories.get(parentId);
      ensure(parent.depth + 1 <= MAX_DEPTH, 'story.depthExceeded', `Maximum depth ${MAX_DEPTH} exceeded`);
    }

    if (story.parentId) {
      const prevParent = this.stories.get(story.parentId);
      prevParent.childrenIds = prevParent.childrenIds.filter((childId) => childId !== story.id);
      this.#syncOrdersForParent(story.mrId, prevParent.id);
    } else {
      const mr = this.mergeRequests.get(story.mrId);
      mr.storyIds = mr.storyIds.filter((storyId) => storyId !== story.id);
      this.#syncOrdersForParent(story.mrId, null);
    }

    story.parentId = parentId ?? null;
    story.depth = parentId ? this.#parentDepth(parentId) + 1 : 0;

    if (parentId) {
      const parent = this.stories.get(parentId);
      const targetIndex = index ?? parent.childrenIds.length;
      parent.childrenIds.splice(targetIndex, 0, story.id);
      story.order = targetIndex;
      this.#syncOrdersForParent(story.mrId, parentId);
    } else {
      const mr = this.mergeRequests.get(story.mrId);
      const targetIndex = index ?? mr.storyIds.length;
      mr.storyIds.splice(targetIndex, 0, story.id);
      story.order = targetIndex;
      this.#syncOrdersForParent(story.mrId, null);
    }

    story.updatedAt = nowIso();
    story.version += 1;
    this.#refreshChildren();
    this.#persistAll();
    return clone(story);
  }

  reorderStory(id, { order }) {
    const story = this.stories.get(id);
    ensure(story, 'story.notFound', 'Story not found');
    ensure(Number.isInteger(order) && order >= 0, 'story.invalid', 'Order must be a non-negative integer');

    if (story.parentId) {
      const parent = this.stories.get(story.parentId);
      parent.childrenIds = parent.childrenIds.filter((childId) => childId !== story.id);
      parent.childrenIds.splice(order, 0, story.id);
      this.#syncOrdersForParent(story.mrId, story.parentId);
    } else {
      const mr = this.mergeRequests.get(story.mrId);
      mr.storyIds = mr.storyIds.filter((storyId) => storyId !== story.id);
      mr.storyIds.splice(order, 0, story.id);
      this.#syncOrdersForParent(story.mrId, null);
    }
    story.order = order;
    story.updatedAt = nowIso();
    story.version += 1;
    this.#persistAll();
    return clone(story);
  }

  getStoryPath(id) {
    const story = this.stories.get(id);
    ensure(story, 'story.notFound', 'Story not found');
    const path = [];
    let current = story;
    while (current) {
      path.unshift(clone(current));
      current = current.parentId ? this.stories.get(current.parentId) : null;
    }
    return path;
  }

  getStoryChildren(id) {
    const story = this.stories.get(id);
    ensure(story, 'story.notFound', 'Story not found');
    return story.childrenIds.map((childId) => clone(this.stories.get(childId)));
  }

  getStoryTree({ mrId, depth }) {
    const mr = this.mergeRequests.get(mrId);
    ensure(mr, 'mergeRequest.notFound', 'Merge request not found');
    const stories = this.listStories({ mrId });
    const tests = this.listTests();

    const build = (storyId, currentDepth) => {
      const story = clone(this.stories.get(storyId));
      const children = story.childrenIds.map((childId) => build(childId, currentDepth + 1));
      const directTests = tests.filter((test) => test.storyId === storyId);
      return {
        story,
        tests: directTests,
        children: depth !== undefined && currentDepth >= depth ? [] : children
      };
    };

    return mr.storyIds.map((id) => build(id, 0));
  }

  listTests({ storyId } = {}) {
    const tests = Array.from(this.tests.values()).filter((test) => (storyId ? test.storyId === storyId : true));
    return tests.map(clone);
  }

  getTest(id) {
    const test = this.tests.get(id);
    ensure(test, 'test.notFound', 'Acceptance test not found');
    return clone(test);
  }

  #createAcceptanceTestInternal(storyId) {
    return sharedCreateAcceptanceTest(storyId);
  }

  createTest(payload) {
    const story = this.stories.get(payload.storyId);
    ensure(story, 'story.notFound', 'Story not found for test');
    const test = this.#createAcceptanceTestInternal(payload.storyId);
    if (payload.given) test.given = payload.given.map((step) => step.trim()).filter(Boolean);
    if (payload.when) test.when = payload.when.map((step) => step.trim()).filter(Boolean);
    if (payload.then) test.then = payload.then.map((step) => step.trim()).filter(Boolean);

    ensure(test.given.length > 0, 'test.givenRequired', 'At least one Given step is required');
    ensure(test.when.length > 0, 'test.whenRequired', 'At least one When step is required');
    ensure(test.then.length > 0, 'test.thenRequired', 'At least one Then step is required');

    const validation = validateAcceptanceTest(test);
    const measurabilityFeedback = summarizeMeasurabilityResult(validation.measurability);
    ensure(
      validation.measurability.ok,
      'test.measurable',
      measurabilityFeedback.summary,
      { ...validation, feedback: measurabilityFeedback }
    );
    test.ambiguityFlags = validation.ambiguity.issues.map((issue) => issue.term);

    this.tests.set(test.id, test);
    story.testIds.push(test.id);
    story.updatedAt = nowIso();
    this.#recalculateInvest(story.id);
    this.#persistAll();
    return clone(test);
  }

  updateTest(id, patch) {
    const test = this.tests.get(id);
    ensure(test, 'test.notFound', 'Acceptance test not found');
    if (patch.given) test.given = patch.given.map((step) => step.trim()).filter(Boolean);
    if (patch.when) test.when = patch.when.map((step) => step.trim()).filter(Boolean);
    if (patch.then) test.then = patch.then.map((step) => step.trim()).filter(Boolean);
    ensure(test.given.length > 0, 'test.givenRequired', 'At least one Given step is required');
    ensure(test.when.length > 0, 'test.whenRequired', 'At least one When step is required');
    ensure(test.then.length > 0, 'test.thenRequired', 'At least one Then step is required');
    if (patch.status) test.status = patch.status;
    test.updatedAt = nowIso();
    test.version += 1;

    const validation = validateAcceptanceTest(test);
    const measurabilityFeedback = summarizeMeasurabilityResult(validation.measurability);
    ensure(
      validation.measurability.ok,
      'test.measurable',
      measurabilityFeedback.summary,
      { ...validation, feedback: measurabilityFeedback }
    );
    if (validation.ambiguity.hasIssues && INVEST_POLICY === 'block') {
      ensure(false, 'test.ambiguity', 'Ambiguous statements detected', validation);
    }
    test.ambiguityFlags = validation.ambiguity.issues.map((issue) => issue.term);
    this.#recalculateInvest(test.storyId);
    this.#persistAll();
    return clone(test);
  }

  deleteTest(id) {
    const test = this.tests.get(id);
    ensure(test, 'test.notFound', 'Acceptance test not found');
    const story = this.stories.get(test.storyId);
    if (story) {
      story.testIds = story.testIds.filter((testId) => testId !== id);
    }
    this.tests.delete(id);
    if (story) {
      story.invest.testable = story.testIds.length > 0;
      this.#recalculateInvest(story.id);
    }
    this.#persistAll();
    return { ok: true };
  }

  rollup(mrId) {
    const mr = this.mergeRequests.get(mrId);
    ensure(mr, 'mergeRequest.notFound', 'Merge request not found');
    const stories = this.listStories({ mrId });
    const tests = this.listTests();
    return rollupStatus(mr, stories, tests);
  }

  #parentDepth(parentId) {
    const parent = this.stories.get(parentId);
    ensure(parent, 'story.parentMissing', 'Parent story not found');
    return parent.depth;
  }

  #syncOrdersForParent(mrId, parentId) {
    if (parentId) {
      const parent = this.stories.get(parentId);
      if (!parent) return;
      parent.childrenIds.forEach((childId, index) => {
        const child = this.stories.get(childId);
        if (child) child.order = index;
      });
    } else {
      const mr = this.mergeRequests.get(mrId);
      if (!mr) return;
      mr.storyIds.forEach((storyId, index) => {
        const story = this.stories.get(storyId);
        if (story) story.order = index;
      });
    }
  }

  #applyInvestResult(story, result) {
    const next = { ...story.invest };
    Object.entries(result.principles).forEach(([key, value]) => {
      next[key] = value.ok;
    });
    story.invest = next;
  }

  #recalculateInvest(storyId) {
    const story = this.stories.get(storyId);
    if (!story) return;
    const stories = Array.from(this.stories.values()).filter((candidate) => candidate.mrId === story.mrId);
    const tests = Array.from(this.tests.values());
    const result = validateStoryInvest(story, { stories, tests });
    this.#applyInvestResult(story, result);
  }
}

export const store = new InMemoryStore();
