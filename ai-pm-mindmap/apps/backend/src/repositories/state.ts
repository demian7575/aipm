import { v4 as uuid } from 'uuid';
import {
  AcceptanceTest,
  AcceptanceTestStatusTransitions,
  MergeRequest,
  MergeRequestStatusTransitions,
  UserStory,
  StoryStatusTransitions,
  createTimestamp,
  evaluateInvest,
  analyzeStoryAmbiguity,
} from '@ai-pm-mindmap/shared';
import { createSeedState } from '../seed/data';

export interface AppState {
  mergeRequests: MergeRequest[];
  stories: UserStory[];
  tests: AcceptanceTest[];
}

export const DEFAULT_DEPTH_LIMIT = Number(process.env.STORY_DEPTH_LIMIT ?? '4');

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const sortStories = (stories: UserStory[]) =>
  stories.sort((a, b) => (a.depth === b.depth ? a.order - b.order : a.depth - b.depth));

const ensureDepthWithinLimit = (depth: number) => {
  if (depth > DEFAULT_DEPTH_LIMIT) {
    throw new Error(`Depth limit of ${DEFAULT_DEPTH_LIMIT} exceeded`);
  }
};

export class InMemoryStore {
  private state: AppState;

  constructor() {
    this.state = createSeedState();
  }

  reset() {
    this.state = createSeedState();
  }

  getState(): AppState {
    return clone(this.state);
  }

  listMergeRequests(): MergeRequest[] {
    return clone(this.state.mergeRequests);
  }

  getMergeRequest(id: string): MergeRequest | undefined {
    return this.state.mergeRequests.find((mr) => mr.id === id);
  }

  createMergeRequest(payload: Omit<MergeRequest, 'id' | 'createdAt' | 'updatedAt'>): MergeRequest {
    const now = createTimestamp();
    const mergeRequest: MergeRequest = {
      ...payload,
      id: uuid(),
      createdAt: now,
      updatedAt: now,
    };
    this.state.mergeRequests.push(mergeRequest);
    return clone(mergeRequest);
  }

  updateMergeRequest(id: string, payload: Partial<Omit<MergeRequest, 'id'>>): MergeRequest {
    const mergeRequest = this.getMergeRequest(id);
    if (!mergeRequest) {
      throw new Error('Merge request not found');
    }

    Object.assign(mergeRequest, payload, { updatedAt: createTimestamp() });
    return clone(mergeRequest);
  }

  deleteMergeRequest(id: string) {
    this.state.mergeRequests = this.state.mergeRequests.filter((mr) => mr.id !== id);
    const storiesToRemove = this.state.stories.filter((story) => story.mrId === id);
    storiesToRemove.forEach((story) => this.deleteStory(story.id));
  }

  listStories(mrId?: string): UserStory[] {
    const stories = mrId
      ? this.state.stories.filter((story) => story.mrId === mrId)
      : this.state.stories;
    return sortStories(clone(stories));
  }

  getStory(id: string): UserStory | undefined {
    return this.state.stories.find((story) => story.id === id);
  }

  private computeDepth(parentId: string | null): number {
    if (!parentId) return 0;
    const parent = this.getStory(parentId);
    if (!parent) {
      throw new Error('Parent story not found');
    }
    return parent.depth + 1;
  }

  private assertNoCycle(storyId: string, parentId: string | null) {
    if (!parentId) return;
    if (storyId === parentId) {
      throw new Error('Cannot move story under itself');
    }
    let currentParent = parentId;
    while (currentParent) {
      if (currentParent === storyId) {
        throw new Error('Cycle detected');
      }
      const parent = this.getStory(currentParent);
      currentParent = parent?.parentId ?? null;
    }
  }

  private nextOrder(parentId: string | null, mrId: string) {
    const siblings = this.state.stories.filter(
      (story) => story.parentId === parentId && story.mrId === mrId,
    );
    return siblings.length;
  }

  createStory(payload: Omit<UserStory, 'id' | 'order' | 'depth' | 'createdAt' | 'updatedAt'>): UserStory {
    const depth = this.computeDepth(payload.parentId);
    ensureDepthWithinLimit(depth);
    const now = createTimestamp();
    const story: UserStory = {
      ...payload,
      id: uuid(),
      depth,
      order: this.nextOrder(payload.parentId, payload.mrId),
      createdAt: now,
      updatedAt: now,
    };
    this.state.stories.push(story);
    return clone(story);
  }

  updateStory(id: string, payload: Partial<Omit<UserStory, 'id' | 'mrId' | 'parentId' | 'depth' | 'order'>>): UserStory {
    const story = this.getStory(id);
    if (!story) {
      throw new Error('Story not found');
    }
    Object.assign(story, payload, { updatedAt: createTimestamp() });
    return clone(story);
  }

  moveStory(id: string, parentId: string | null, index: number) {
    const story = this.getStory(id);
    if (!story) throw new Error('Story not found');
    const previousParent = story.parentId;
    this.assertNoCycle(id, parentId);
    const depth = this.computeDepth(parentId);
    ensureDepthWithinLimit(depth);
    story.parentId = parentId;
    story.depth = depth;
    story.updatedAt = createTimestamp();
    this.reindexSiblings(parentId, story.mrId, id, index);
    if (previousParent !== parentId) {
      this.normalizeOrders(previousParent, story.mrId);
    }
  }

  reorderStoryChildren(parentId: string | null, order: string[]) {
    const siblings = this.state.stories.filter((story) => story.parentId === parentId);
    if (siblings.length !== order.length) {
      throw new Error('Order length mismatch');
    }
    order.forEach((storyId, idx) => {
      const story = this.getStory(storyId);
      if (!story || story.parentId !== parentId) {
        throw new Error('Story not found in target parent');
      }
      story.order = idx;
    });
  }

  private reindexSiblings(parentId: string | null, mrId: string, storyId: string, index: number) {
    const siblings = this.state.stories
      .filter((story) => story.parentId === parentId && story.mrId === mrId && story.id !== storyId)
      .sort((a, b) => a.order - b.order);

    siblings.splice(index, 0, this.getStory(storyId)!);
    siblings.forEach((story, idx) => {
      story.order = idx;
    });
  }

  private normalizeOrders(parentId: string | null, mrId: string) {
    this.state.stories
      .filter((story) => story.parentId === parentId && story.mrId === mrId)
      .sort((a, b) => a.order - b.order)
      .forEach((story, idx) => {
        story.order = idx;
      });
  }

  deleteStory(id: string) {
    const toDelete = new Set<string>();
    const collect = (storyId: string) => {
      toDelete.add(storyId);
      this.state.stories
        .filter((story) => story.parentId === storyId)
        .forEach((child) => collect(child.id));
    };
    collect(id);

    this.state.stories = this.state.stories.filter((story) => !toDelete.has(story.id));
    this.state.tests = this.state.tests.filter((test) => !toDelete.has(test.storyId));
  }

  updateStoryStatus(id: string, status: UserStory['status']) {
    const story = this.getStory(id);
    if (!story) throw new Error('Story not found');
    const allowed = StoryStatusTransitions[story.status];
    if (!allowed.includes(status)) {
      throw new Error('Invalid transition');
    }
    story.status = status;
    story.updatedAt = createTimestamp();
    return clone(story);
  }

  getStoryPath(id: string): UserStory[] {
    const story = this.getStory(id);
    if (!story) throw new Error('Story not found');
    const path: UserStory[] = [];
    let current: UserStory | undefined = story;
    while (current) {
      path.unshift(current);
      current = current.parentId ? this.getStory(current.parentId) : undefined;
    }
    return path.map((node) => clone(node));
  }

  listTests(storyId?: string): AcceptanceTest[] {
    const tests = storyId
      ? this.state.tests.filter((test) => test.storyId === storyId)
      : this.state.tests;
    return clone(tests);
  }

  getTest(id: string): AcceptanceTest | undefined {
    return this.state.tests.find((test) => test.id === id);
  }

  createTest(payload: Omit<AcceptanceTest, 'id' | 'createdAt' | 'updatedAt'>): AcceptanceTest {
    const story = this.getStory(payload.storyId);
    if (!story) throw new Error('Story not found for acceptance test');
    const now = createTimestamp();
    const test: AcceptanceTest = {
      ...payload,
      id: uuid(),
      createdAt: now,
      updatedAt: now,
    };
    this.state.tests.push(test);
    return clone(test);
  }

  updateTest(id: string, payload: Partial<Omit<AcceptanceTest, 'id' | 'storyId'>>): AcceptanceTest {
    const test = this.getTest(id);
    if (!test) throw new Error('Test not found');
    Object.assign(test, payload, { updatedAt: createTimestamp() });
    return clone(test);
  }

  updateTestStatus(id: string, status: AcceptanceTest['status']) {
    const test = this.getTest(id);
    if (!test) throw new Error('Test not found');
    const allowed = AcceptanceTestStatusTransitions[test.status];
    if (!allowed.includes(status)) {
      throw new Error('Invalid transition');
    }
    test.status = status;
    test.updatedAt = createTimestamp();
    return clone(test);
  }

  deleteTest(id: string) {
    this.state.tests = this.state.tests.filter((test) => test.id !== id);
  }

  updateMergeRequestStatus(id: string, status: MergeRequest['status']) {
    const mr = this.getMergeRequest(id);
    if (!mr) throw new Error('Merge request not found');
    const allowed = MergeRequestStatusTransitions[mr.status];
    if (!allowed.includes(status)) {
      throw new Error('Invalid transition');
    }
    mr.status = status;
    mr.updatedAt = createTimestamp();
    return clone(mr);
  }

  toggleMergeRequestDrift(id: string) {
    const mr = this.getMergeRequest(id);
    if (!mr) throw new Error('Merge request not found');
    mr.drifted = !mr.drifted;
    mr.lastSyncAt = mr.drifted ? mr.lastSyncAt : createTimestamp();
    mr.updatedAt = createTimestamp();
    return clone(mr);
  }

  getStoryAnalysis(storyId: string) {
    const story = this.getStory(storyId);
    if (!story) throw new Error('Story not found');
    const children = this.state.stories.filter((child) => child.parentId === storyId);
    const tests = this.state.tests.filter((test) => test.storyId === storyId);
    const invest = evaluateInvest(story, { children, tests });
    const ambiguity = analyzeStoryAmbiguity(story, tests);
    return { invest, ambiguity };
  }

  getTree(mrId: string) {
    const stories = this.listStories(mrId);
    const byParent = new Map<string | null, UserStory[]>();
    stories.forEach((story) => {
      const bucket = byParent.get(story.parentId) ?? [];
      bucket.push(story);
      byParent.set(story.parentId, bucket);
    });
    const build = (parentId: string | null): any[] => {
      const nodes = byParent.get(parentId) ?? [];
      return nodes
        .sort((a, b) => a.order - b.order)
        .map((node) => ({
          ...node,
          children: build(node.id),
          tests: this.listTests(node.id),
          analysis: this.getStoryAnalysis(node.id),
        }));
    };
    return build(null);
  }
}

export const store = new InMemoryStore();
