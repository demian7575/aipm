import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { customAlphabet } from 'nanoid';
import {
  AcceptanceTest,
  AcceptanceTestSchema,
  MergeRequest,
  MergeRequestSchema,
  UserStory,
  UserStorySchema,
  analyzeStory,
  analyzeTest
} from '@ai-pm-mindmap/shared';
import { MAX_STORY_DEPTH } from '../config';
import { badRequest, conflict, notFound } from '../errors';

interface DatabaseState {
  mergeRequests: MergeRequest[];
  stories: UserStory[];
  tests: AcceptanceTest[];
}

const idNanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

function loadSeed(): DatabaseState {
  const seedPath = join(process.cwd(), 'apps', 'backend', 'seed', 'data.json');
  const data = JSON.parse(readFileSync(seedPath, 'utf-8')) as DatabaseState;
  return structuredClone(data);
}

function now() {
  return new Date().toISOString();
}

const STORY_STATUS_TRANSITIONS: Record<UserStory['status'], UserStory['status'][]> = {
  draft: ['ready', 'in-progress', 'blocked'],
  ready: ['in-progress', 'blocked'],
  'in-progress': ['done', 'blocked'],
  blocked: ['in-progress'],
  done: ['in-progress']
};

const TEST_STATUS_TRANSITIONS: Record<AcceptanceTest['status'], AcceptanceTest['status'][]> = {
  pending: ['passing', 'failing'],
  passing: ['failing', 'pending'],
  failing: ['passing', 'pending']
};

function cloneState(state: DatabaseState): DatabaseState {
  return {
    mergeRequests: structuredClone(state.mergeRequests),
    stories: structuredClone(state.stories),
    tests: structuredClone(state.tests)
  };
}

class InMemoryStore {
  private state: DatabaseState = loadSeed();

  reset() {
    this.state = loadSeed();
  }

  getState(): DatabaseState {
    return cloneState(this.state);
  }

  // Merge Requests
  listMergeRequests() {
    return structuredClone(this.state.mergeRequests);
  }

  getMergeRequest(id: string) {
    const mr = this.state.mergeRequests.find((item) => item.id === id);
    if (!mr) throw notFound('Merge request not found');
    return structuredClone(mr);
  }

  createMergeRequest(data: Omit<MergeRequest, 'id' | 'createdAt' | 'updatedAt' | 'lastSyncAt' | 'drift'>) {
    const parsed = MergeRequestSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      lastSyncAt: true,
      drift: true
    }).parse(data);
    const mr: MergeRequest = {
      ...parsed,
      id: `mr-${idNanoid()}`,
      createdAt: now(),
      updatedAt: now(),
      lastSyncAt: now(),
      drift: false
    };
    this.state.mergeRequests.push(mr);
    return structuredClone(mr);
  }

  updateMergeRequest(id: string, data: Partial<MergeRequest>) {
    const mr = this.state.mergeRequests.find((item) => item.id === id);
    if (!mr) throw notFound('Merge request not found');
    const merged = { ...mr, ...data, id: mr.id, updatedAt: now() };
    const validated = MergeRequestSchema.parse(merged);
    Object.assign(mr, validated);
    return structuredClone(mr);
  }

  deleteMergeRequest(id: string) {
    const index = this.state.mergeRequests.findIndex((item) => item.id === id);
    if (index === -1) throw notFound('Merge request not found');
    this.state.mergeRequests.splice(index, 1);
    const storyIds = this.state.stories.filter((story) => story.mrId === id).map((story) => story.id);
    this.state.stories = this.state.stories.filter((story) => story.mrId !== id);
    this.state.tests = this.state.tests.filter((test) => !storyIds.includes(test.storyId));
  }

  updateMergeRequestStatus(id: string, status: MergeRequest['status']) {
    const mr = this.state.mergeRequests.find((item) => item.id === id);
    if (!mr) throw notFound('Merge request not found');
    mr.status = status;
    mr.updatedAt = now();
    return structuredClone(mr);
  }

  toggleDrift(id: string) {
    const mr = this.state.mergeRequests.find((item) => item.id === id);
    if (!mr) throw notFound('Merge request not found');
    mr.drift = !mr.drift;
    mr.lastSyncAt = now();
    mr.updatedAt = now();
    return structuredClone(mr);
  }

  // Stories
  listStories() {
    return structuredClone(this.state.stories);
  }

  private ensureDepth(parentId: string | null) {
    if (!parentId) return 0;
    const parent = this.state.stories.find((story) => story.id === parentId);
    if (!parent) throw badRequest('Parent story not found');
    if (parent.depth + 1 > MAX_STORY_DEPTH) {
      throw badRequest(`Depth limit of ${MAX_STORY_DEPTH} exceeded`);
    }
    return parent.depth + 1;
  }

  private ensureNoCycle(storyId: string, parentId: string | null) {
    if (!parentId) return;
    if (parentId === storyId) throw conflict('Cannot set story as its own parent');
    let currentParent = parentId;
    while (currentParent) {
      if (currentParent === storyId) {
        throw conflict('Cannot create cyclical relationships');
      }
      const parent = this.state.stories.find((story) => story.id === currentParent);
      currentParent = parent?.parentId ?? null;
    }
  }

  private childCount(parentId: string | null) {
    return this.state.stories.filter((story) => story.parentId === parentId).length;
  }

  private orderForParent(parentId: string | null) {
    const siblings = this.state.stories.filter((story) => story.parentId === parentId);
    return siblings.length;
  }

  createStory(data: Omit<UserStory, 'id' | 'depth' | 'order' | 'createdAt' | 'updatedAt'>) {
    const parsed = UserStorySchema.omit({
      id: true,
      depth: true,
      order: true,
      createdAt: true,
      updatedAt: true
    }).parse(data);

    const depth = this.ensureDepth(parsed.parentId);
    this.ensureNoCycle('new', parsed.parentId);

    const invest = analyzeStory({
      title: parsed.title,
      action: parsed.action,
      reason: parsed.reason,
      role: parsed.role,
      estimateDays: parsed.estimateDays,
      gwt: parsed.gwt
    });

    if (!invest.invest.compliant) {
      throw badRequest('Story fails INVEST validation', invest.invest.issues);
    }

    const story: UserStory = {
      ...parsed,
      id: `story-${idNanoid()}`,
      depth,
      order: this.orderForParent(parsed.parentId),
      createdAt: now(),
      updatedAt: now()
    };

    this.state.stories.push(story);
    return structuredClone(story);
  }

  getStory(id: string) {
    const story = this.state.stories.find((item) => item.id === id);
    if (!story) throw notFound('Story not found');
    return structuredClone(story);
  }

  updateStory(id: string, data: Partial<UserStory>) {
    const story = this.state.stories.find((item) => item.id === id);
    if (!story) throw notFound('Story not found');

    const next = { ...story, ...data, id: story.id };
    const validated = UserStorySchema.parse({ ...next, updatedAt: story.updatedAt, createdAt: story.createdAt });

    const invest = analyzeStory({
      title: validated.title,
      action: validated.action,
      reason: validated.reason,
      role: validated.role,
      estimateDays: validated.estimateDays,
      gwt: validated.gwt
    });
    if (!invest.invest.compliant) {
      throw badRequest('Story fails INVEST validation', invest.invest.issues);
    }

    Object.assign(story, { ...validated, updatedAt: now() });
    return structuredClone(story);
  }

  updateStoryStatus(id: string, status: UserStory['status']) {
    const story = this.state.stories.find((item) => item.id === id);
    if (!story) throw notFound('Story not found');
    const allowed = STORY_STATUS_TRANSITIONS[story.status] ?? [];
    if (!allowed.includes(status)) {
      throw conflict(`Cannot transition story from ${story.status} to ${status}`);
    }
    story.status = status;
    story.updatedAt = now();
    return structuredClone(story);
  }

  deleteStory(id: string) {
    const story = this.state.stories.find((item) => item.id === id);
    if (!story) throw notFound('Story not found');
    const descendants = this.collectDescendants(id);
    this.state.stories = this.state.stories.filter((item) => item.id !== id && !descendants.includes(item.id));
    this.state.tests = this.state.tests.filter((test) => ![id, ...descendants].includes(test.storyId));
  }

  moveStory(id: string, parentId: string | null, index: number) {
    const story = this.state.stories.find((item) => item.id === id);
    if (!story) throw notFound('Story not found');
    this.ensureNoCycle(id, parentId);
    const newDepth = this.calculateDepthForMove(parentId);

    const oldParentId = story.parentId;
    story.parentId = parentId;
    story.updatedAt = now();

    const oldSiblings = this.state.stories
      .filter((item) => item.parentId === oldParentId && item.id !== id)
      .sort((a, b) => a.order - b.order);
    oldSiblings.forEach((sibling, order) => {
      sibling.order = order;
    });

    const siblings = this.state.stories
      .filter((item) => item.parentId === parentId && item.id !== id)
      .sort((a, b) => a.order - b.order);
    const targetIndex = Math.min(Math.max(index, 0), siblings.length);
    siblings.splice(targetIndex, 0, story);
    siblings.forEach((sibling, order) => {
      sibling.order = order;
    });

    this.updateDepths(story, newDepth);
    return structuredClone(story);
  }

  reorderChildren(parentId: string | null, order: string[]) {
    const siblings = this.state.stories.filter((story) => story.parentId === parentId);
    if (order.length !== siblings.length) {
      throw badRequest('Order length mismatch');
    }
    const siblingMap = new Map(siblings.map((story) => [story.id, story]));
    order.forEach((id, index) => {
      const sibling = siblingMap.get(id);
      if (!sibling) throw badRequest('Invalid story id in order');
      sibling.order = index;
      sibling.updatedAt = now();
    });
  }

  private calculateDepthForMove(parentId: string | null) {
    if (!parentId) return 0;
    const parent = this.state.stories.find((story) => story.id === parentId);
    if (!parent) throw badRequest('Parent story not found');
    if (parent.depth + 1 > MAX_STORY_DEPTH) {
      throw badRequest(`Depth limit of ${MAX_STORY_DEPTH} exceeded`);
    }
    return parent.depth + 1;
  }

  private collectDescendants(id: string, acc: string[] = []) {
    const children = this.state.stories.filter((story) => story.parentId === id);
    for (const child of children) {
      acc.push(child.id);
      this.collectDescendants(child.id, acc);
    }
    return acc;
  }

  private updateDepths(story: UserStory, depth: number) {
    if (depth > MAX_STORY_DEPTH) {
      throw badRequest(`Depth limit of ${MAX_STORY_DEPTH} exceeded`);
    }
    story.depth = depth;
    const children = this.state.stories.filter((item) => item.parentId === story.id);
    children.forEach((child) => this.updateDepths(child, depth + 1));
  }

  getStoryTree(mrId: string) {
    const stories = this.state.stories.filter((story) => story.mrId === mrId);
    const map = new Map<string, (UserStory & { children: UserStory[] })>();
    const root: (UserStory & { children: UserStory[] })[] = [];
    for (const story of stories) {
      map.set(story.id, { ...story, children: [] });
    }
    for (const story of stories) {
      const node = map.get(story.id)!;
      if (story.parentId && map.has(story.parentId)) {
        map.get(story.parentId)!.children.push(node);
      } else {
        root.push(node);
      }
    }
    const sortRecursive = (nodes: (UserStory & { children: UserStory[] })[]) => {
      nodes.sort((a, b) => a.order - b.order);
      nodes.forEach((child) => sortRecursive(child.children));
    };
    sortRecursive(root);
    return root;
  }

  getStoryPath(id: string) {
    const path: UserStory[] = [];
    let current: UserStory | undefined = this.state.stories.find((story) => story.id === id);
    if (!current) throw notFound('Story not found');
    while (current) {
      path.unshift(structuredClone(current));
      current = current.parentId ? this.state.stories.find((story) => story.id === current!.parentId) : undefined;
    }
    return path;
  }

  // Tests
  listTests() {
    return structuredClone(this.state.tests);
  }

  createTest(data: Omit<AcceptanceTest, 'id' | 'createdAt' | 'updatedAt'>) {
    const parsed = AcceptanceTestSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(data);
    const story = this.state.stories.find((item) => item.id === parsed.storyId);
    if (!story) throw badRequest('Story not found for test');
    const analysis = analyzeTest({ title: parsed.title, steps: parsed.steps });
    if (analysis.ambiguity.length > 0) {
      throw badRequest('Acceptance test contains ambiguous steps', analysis.ambiguity);
    }
    const test: AcceptanceTest = {
      ...parsed,
      id: `test-${idNanoid()}`,
      createdAt: now(),
      updatedAt: now()
    };
    this.state.tests.push(test);
    return structuredClone(test);
  }

  updateTest(id: string, data: Partial<AcceptanceTest>) {
    const test = this.state.tests.find((item) => item.id === id);
    if (!test) throw notFound('Test not found');
    const next = { ...test, ...data, id: test.id };
    const validated = AcceptanceTestSchema.parse({ ...next, updatedAt: test.updatedAt, createdAt: test.createdAt });
    const analysis = analyzeTest({ title: validated.title, steps: validated.steps });
    if (analysis.ambiguity.length > 0) {
      throw badRequest('Acceptance test contains ambiguous steps', analysis.ambiguity);
    }
    Object.assign(test, { ...validated, updatedAt: now() });
    return structuredClone(test);
  }

  updateTestStatus(id: string, status: AcceptanceTest['status']) {
    const test = this.state.tests.find((item) => item.id === id);
    if (!test) throw notFound('Test not found');
    const allowed = TEST_STATUS_TRANSITIONS[test.status] ?? [];
    if (!allowed.includes(status)) {
      throw conflict(`Cannot transition test from ${test.status} to ${status}`);
    }
    test.status = status;
    test.updatedAt = now();
    return structuredClone(test);
  }

  deleteTest(id: string) {
    const index = this.state.tests.findIndex((item) => item.id === id);
    if (index === -1) throw notFound('Test not found');
    this.state.tests.splice(index, 1);
  }
}

export const store = new InMemoryStore();
