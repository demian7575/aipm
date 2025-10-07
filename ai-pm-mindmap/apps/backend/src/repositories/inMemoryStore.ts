import {
  AcceptanceTest,
  AcceptanceTestSchema,
  MergeRequest,
  MergeRequestSchema,
  StoryStatus,
  UserStory,
  UserStorySchema,
  validateStoryNarrative,
  checkInvest,
  detectAmbiguity,
  hasMeasurableValue
} from '@ai-pm-mindmap/shared';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { DEPTH_LIMIT, INVEST_MAX_CHILDREN, INVEST_SMALL_DAYS } from '../config';
import { badRequest, conflict, notFound, unprocessable } from '../errors';

export interface DatabaseState {
  mergeRequests: MergeRequest[];
  stories: UserStory[];
  tests: AcceptanceTest[];
}

const STORY_STATUS_TRANSITIONS: Record<StoryStatus, StoryStatus[]> = {
  draft: ['ready', 'blocked'],
  ready: ['in-progress', 'blocked'],
  'in-progress': ['blocked', 'done'],
  blocked: ['ready', 'in-progress'],
  done: []
};

export class InMemoryStore {
  private mergeRequests = new Map<string, MergeRequest>();
  private stories = new Map<string, UserStory>();
  private tests = new Map<string, AcceptanceTest>();

  constructor() {
    this.reset();
  }

  reset() {
    const file = resolve(__dirname, '..', '..', 'seed', 'data.json');
    const raw = JSON.parse(readFileSync(file, 'utf-8')) as DatabaseState;
    this.mergeRequests.clear();
    this.stories.clear();
    this.tests.clear();

    raw.mergeRequests.forEach((mr) => this.mergeRequests.set(mr.id, mr));
    raw.stories.forEach((story) => this.stories.set(story.id, story));
    raw.tests.forEach((test) => this.tests.set(test.id, test));
  }

  getState(): DatabaseState {
    return {
      mergeRequests: Array.from(this.mergeRequests.values()),
      stories: Array.from(this.stories.values()),
      tests: Array.from(this.tests.values())
    };
  }

  // Merge Request CRUD
  listMergeRequests(): MergeRequest[] {
    return Array.from(this.mergeRequests.values());
  }

  getMergeRequest(id: string): MergeRequest {
    const value = this.mergeRequests.get(id);
    if (!value) throw notFound('Merge request not found');
    return value;
  }

  createMergeRequest(payload: MergeRequest): MergeRequest {
    if (this.mergeRequests.has(payload.id)) {
      throw conflict('Merge request already exists');
    }
    const parsed = MergeRequestSchema.parse(payload);
    this.mergeRequests.set(parsed.id, parsed);
    return parsed;
  }

  updateMergeRequest(id: string, payload: Partial<MergeRequest>): MergeRequest {
    const existing = this.getMergeRequest(id);
    const updated = { ...existing, ...payload, updatedAt: new Date().toISOString() };
    const parsed = MergeRequestSchema.parse(updated);
    this.mergeRequests.set(parsed.id, parsed);
    return parsed;
  }

  deleteMergeRequest(id: string) {
    if (!this.mergeRequests.delete(id)) {
      throw notFound('Merge request not found');
    }
    for (const story of this.listStoriesByMergeRequest(id)) {
      this.deleteStory(story.id, { cascade: true });
    }
  }

  updateMergeRequestStatus(id: string, status: MergeRequest['status']): MergeRequest {
    const allowedTransitions: Record<MergeRequest['status'], MergeRequest['status'][]> = {
      open: ['review', 'closed'],
      review: ['merged', 'closed'],
      merged: [],
      closed: []
    };
    const existing = this.getMergeRequest(id);
    if (!allowedTransitions[existing.status].includes(status)) {
      throw unprocessable('Invalid status transition', { from: existing.status, to: status });
    }
    return this.updateMergeRequest(id, { status });
  }

  toggleDrift(id: string): MergeRequest {
    const mr = this.getMergeRequest(id);
    return this.updateMergeRequest(id, {
      drift: !mr.drift,
      lastSyncAt: new Date().toISOString()
    });
  }

  // Story operations
  listStories(): UserStory[] {
    return Array.from(this.stories.values());
  }

  listStoriesByMergeRequest(mrId: string): UserStory[] {
    return this.listStories().filter((story) => story.mrId === mrId);
  }

  getStory(id: string): UserStory {
    const story = this.stories.get(id);
    if (!story) throw notFound('Story not found');
    return story;
  }

  createStory(payload: Omit<UserStory, 'createdAt' | 'updatedAt' | 'depth' | 'order'>): UserStory {
    const parent = payload.parentId ? this.getStory(payload.parentId) : null;
    const depth = parent ? parent.depth + 1 : 0;
    if (depth >= DEPTH_LIMIT) {
      throw unprocessable('Depth limit exceeded', { depth, limit: DEPTH_LIMIT });
    }
    const siblingCount = this.getChildren(payload.parentId).length;
    if (parent && siblingCount + 1 > INVEST_MAX_CHILDREN) {
      throw unprocessable('Parent would exceed child limit', {
        parentId: parent.id,
        limit: INVEST_MAX_CHILDREN
      });
    }
    const order = siblingCount;
    const now = new Date().toISOString();
    const story: UserStory = UserStorySchema.parse({
      ...payload,
      depth,
      order,
      createdAt: now,
      updatedAt: now
    });

    this.ensureInvestCompliance(story);

    this.stories.set(story.id, story);
    return story;
  }

  updateStory(id: string, payload: Partial<UserStory>): UserStory {
    const existing = this.getStory(id);
    const updated = UserStorySchema.parse({
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString()
    });

    this.ensureInvestCompliance(updated);

    this.stories.set(updated.id, updated);
    return updated;
  }

  deleteStory(id: string, options: { cascade?: boolean } = {}) {
    const story = this.getStory(id);
    const parentId = story.parentId;
    if (!options.cascade && this.getChildren(id).length > 0) {
      throw conflict('Cannot delete a story with children');
    }
    this.stories.delete(id);
    if (options.cascade) {
      for (const child of this.getChildren(id)) {
        this.deleteStory(child.id, { cascade: true });
      }
    }
    for (const test of this.listTestsByStory(id)) {
      this.deleteTest(test.id);
    }
    this.normalizeOrder(parentId);
  }

  updateStoryStatus(id: string, status: StoryStatus): UserStory {
    const story = this.getStory(id);
    if (!STORY_STATUS_TRANSITIONS[story.status].includes(status)) {
      throw unprocessable('Invalid story status transition', {
        from: story.status,
        to: status
      });
    }
    return this.updateStory(id, { status });
  }

  moveStory(id: string, parentId: string | null, index: number): UserStory {
    const story = this.getStory(id);
    const oldParentId = story.parentId;
    if (story.parentId === parentId && index === story.order) {
      return story;
    }
    if (id === parentId) {
      throw badRequest('Story cannot be its own parent');
    }
    const parent = parentId ? this.getStory(parentId) : null;
    if (parent) {
      if (this.isDescendant(parentId, id)) {
        throw conflict('Cannot move story into its descendant');
      }
      if (parent.depth + 1 >= DEPTH_LIMIT) {
        throw unprocessable('Depth limit exceeded', { depth: parent.depth + 1, limit: DEPTH_LIMIT });
      }
    }
    const siblings = this.getChildren(parentId);
    const newIndex = Math.max(0, Math.min(index, siblings.length));

    const movedSiblings = siblings.filter((s) => s.id !== id);
    movedSiblings.splice(newIndex, 0, story);
    if (parent && movedSiblings.length > INVEST_MAX_CHILDREN) {
      throw unprocessable('Parent would exceed child limit', {
        parentId,
        limit: INVEST_MAX_CHILDREN
      });
    }
    movedSiblings.forEach((s, idx) => {
      const target = this.getStory(s.id);
      this.stories.set(s.id, { ...target, order: idx });
    });

    const depth = parent ? parent.depth + 1 : 0;
    const updated = { ...story, parentId, depth, order: newIndex, updatedAt: new Date().toISOString() };
    this.stories.set(id, updated);

    for (const child of this.getChildren(id)) {
      this.updateDepthRecursive(child.id, updated.depth + 1);
    }

    if (oldParentId !== parentId) {
      this.normalizeOrder(oldParentId);
    }

    this.normalizeOrder(parentId);

    return updated;
  }

  reorderChildren(parentId: string | null, order: string[]) {
    const children = this.getChildren(parentId);
    if (children.length !== order.length || new Set(children.map((c) => c.id)).size !== order.length) {
      throw badRequest('Order length mismatch');
    }
    const idSet = new Set(order);
    children.forEach((child) => {
      if (!idSet.has(child.id)) {
        throw badRequest('Invalid child id in order');
      }
    });
    order.forEach((childId, idx) => {
      const child = this.getStory(childId);
      this.stories.set(childId, { ...child, order: idx, updatedAt: new Date().toISOString() });
    });
  }

  getStoryPath(id: string): UserStory[] {
    const story = this.getStory(id);
    const path: UserStory[] = [story];
    let current = story;
    while (current.parentId) {
      current = this.getStory(current.parentId);
      path.unshift(current);
    }
    return path;
  }

  // Tests
  listTests(): AcceptanceTest[] {
    return Array.from(this.tests.values());
  }

  listTestsByStory(storyId: string): AcceptanceTest[] {
    return this.listTests().filter((test) => test.storyId === storyId);
  }

  getTest(id: string): AcceptanceTest {
    const test = this.tests.get(id);
    if (!test) throw notFound('Test not found');
    return test;
  }

  createTest(payload: Omit<AcceptanceTest, 'createdAt' | 'updatedAt'>): AcceptanceTest {
    const story = this.getStory(payload.storyId);
    this.ensureInvestCompliance(story);
    this.ensureTestable(payload);
    const now = new Date().toISOString();
    const test = AcceptanceTestSchema.parse({
      ...payload,
      createdAt: now,
      updatedAt: now
    });
    this.tests.set(test.id, test);
    return test;
  }

  updateTest(id: string, payload: Partial<AcceptanceTest>): AcceptanceTest {
    const existing = this.getTest(id);
    this.ensureTestable({ ...existing, ...payload });
    const updated = AcceptanceTestSchema.parse({
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString()
    });
    this.tests.set(id, updated);
    return updated;
  }

  deleteTest(id: string) {
    if (!this.tests.delete(id)) {
      throw notFound('Test not found');
    }
  }

  private getChildren(parentId: string | null): UserStory[] {
    return this.listStories()
      .filter((story) => story.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }

  private normalizeOrder(parentId: string | null) {
    const children = this.getChildren(parentId);
    children.forEach((child, index) => {
      if (child.order !== index) {
        this.stories.set(child.id, { ...child, order: index });
      }
    });
  }

  getStoryTree(mrId: string) {
    const stories = this.listStoriesByMergeRequest(mrId).sort((a, b) => a.order - b.order);
    const map = new Map<string, UserStory & { children: UserStory[] }>();
    const roots: (UserStory & { children: UserStory[] })[] = [];
    stories.forEach((story) => map.set(story.id, { ...story, children: [] }));
    stories.forEach((story) => {
      const node = map.get(story.id)!;
      if (story.parentId) {
        const parent = map.get(story.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  private updateDepthRecursive(id: string, depth: number) {
    const story = this.getStory(id);
    if (depth >= DEPTH_LIMIT) {
      throw unprocessable('Depth limit exceeded', { depth, limit: DEPTH_LIMIT });
    }
    const updated = { ...story, depth };
    this.stories.set(id, updated);
    for (const child of this.getChildren(id)) {
      this.updateDepthRecursive(child.id, depth + 1);
    }
  }

  private isDescendant(targetId: string, potentialAncestorId: string): boolean {
    let current = this.getStory(targetId);
    while (current.parentId) {
      if (current.parentId === potentialAncestorId) return true;
      current = this.getStory(current.parentId);
    }
    return false;
  }

  private ensureInvestCompliance(story: UserStory) {
    const validation = validateStoryNarrative(story, 'en');
    if (!validation.invest.passed) {
      throw unprocessable('INVEST check failed', validation);
    }
    const childrenCount = this.getChildren(story.id).length;
    const invest = checkInvest(
      {
        title: story.title,
        estimateDays: story.estimateDays,
        childrenCount
      },
      {
        smallEstimateDays: INVEST_SMALL_DAYS,
        maxChildren: INVEST_MAX_CHILDREN
      }
    );
    if (!invest.passed) {
      throw unprocessable('Story violates INVEST rules', invest);
    }
  }

  private ensureTestable(test: Pick<AcceptanceTest, 'title' | 'steps'>) {
    const ambiguous = detectAmbiguity(test.title).length;
    const measurable = hasMeasurableValue(test.title) || test.steps.some(hasMeasurableValue);
    if (ambiguous > 0) {
      throw unprocessable('Acceptance test title is ambiguous', test.title);
    }
    if (!measurable) {
      throw unprocessable('Acceptance test must include measurable expectations', test.steps);
    }
  }
}

export const store = new InMemoryStore();
