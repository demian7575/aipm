import { formatISO } from 'date-fns';
import { v4 as uuid } from 'uuid';
import {
  MergeRequest,
  UserStory,
  AcceptanceTest,
  createStory as sharedCreateStory,
  createAcceptanceTest as sharedCreateAcceptanceTest,
  rollupStatus
} from '@ai-pm/shared';
import { INVEST_POLICY, MAX_DEPTH } from './config.js';
import { validateStoryInvest, validateAcceptanceTest } from '@ai-pm/shared';

export interface MovePayload {
  parentId: string | null;
  index: number;
}

export interface ReorderPayload {
  order: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class InMemoryStore {
  private mergeRequests = new Map<string, MergeRequest>();
  private stories = new Map<string, UserStory>();
  private tests = new Map<string, AcceptanceTest>();

  seed() {
    this.reset();
    const now = formatISO(new Date());
    const mrId = uuid();
    const mr: MergeRequest = {
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

    const root1 = this.createStory({
      mrId: mr.id,
      parentId: null,
      order: 0,
      depth: 0,
      title: 'US1 Mindmap shell',
      asA: 'As an AI PM',
      iWant: 'I want a collaborative planning canvas',
      soThat: 'I can align the team quickly'
    });
    const root2 = this.createStory({
      mrId: mr.id,
      parentId: null,
      order: 1,
      depth: 0,
      title: 'US2 Outline interaction',
      asA: 'As a reviewer',
      iWant: 'I want to audit the outline efficiently',
      soThat: 'I can approve plans faster'
    });
    const child1 = this.createStory({
      mrId: mr.id,
      parentId: root1.id,
      order: 0,
      depth: 1,
      title: 'US1-1 Render nodes',
      asA: 'As a user',
      iWant: 'I want to visualize nodes',
      soThat: 'I understand the plan'
    });
    const child2 = this.createStory({
      mrId: mr.id,
      parentId: root1.id,
      order: 1,
      depth: 1,
      title: 'US1-2 Validate INVEST quickly',
      asA: 'As a planner',
      iWant: 'I want automated INVEST checks',
      soThat: 'I can spot issues'
    });
    const child3 = this.createStory({
      mrId: mr.id,
      parentId: root1.id,
      order: 2,
      depth: 1,
      title: 'US1-3 Provide mindmap layout',
      asA: 'As a developer',
      iWant: 'I want radial layout guidance',
      soThat: 'I ship faster'
    });

    const failingInvest = this.createStory({
      mrId: mr.id,
      parentId: root2.id,
      order: 0,
      depth: 1,
      title: 'US2-1 Combine many tasks and must have',
      asA: 'As a stakeholder',
      iWant: 'I want everything and must deliver',
      soThat: 'It is optimal and fast'
    });

    const ambiguousTestStory = this.createStory({
      mrId: mr.id,
      parentId: root2.id,
      order: 1,
      depth: 1,
      title: 'US2-2 Ambiguous acceptance',
      asA: 'As QA',
      iWant: 'I want steps defined',
      soThat: 'we can validate appropriately'
    });

    const stories = [root1, root2, child1, child2, child3, failingInvest, ambiguousTestStory];
    stories.forEach((story) => this.stories.set(story.id, story));
    mr.storyIds = stories.filter((story) => !story.parentId).map((story) => story.id);
    this.mergeRequests.set(mr.id, mr);

    const approvedTest = sharedCreateAcceptanceTest(child1.id);
    approvedTest.status = 'Pass';
    const ambiguousTest = sharedCreateAcceptanceTest(ambiguousTestStory.id);
    ambiguousTest.then = ['The system responds 빠르게 and optimally'];
    ambiguousTest.ambiguityFlags = ['빠르게', 'optimal'];
    ambiguousTest.status = 'Draft';
    const measurableWarning = sharedCreateAcceptanceTest(child2.id);
    measurableWarning.status = 'Ready';
    measurableWarning.then = ['User sees INVEST warning within 2 seconds'];
    const failingTest = sharedCreateAcceptanceTest(failingInvest.id);
    failingTest.status = 'Fail';
    const tests = [approvedTest, ambiguousTest, measurableWarning, failingTest];
    tests.forEach((test) => this.tests.set(test.id, test));

    stories.forEach((story) => {
      story.testIds = tests.filter((test) => test.storyId === story.id).map((test) => test.id);
      story.childrenIds = stories.filter((s) => s.parentId === story.id).map((s) => s.id);
    });
  }

  reset() {
    this.mergeRequests.clear();
    this.stories.clear();
    this.tests.clear();
  }

  getState() {
    return {
      mergeRequests: Array.from(this.mergeRequests.values()),
      stories: Array.from(this.stories.values()),
      tests: Array.from(this.tests.values())
    };
  }

  listMergeRequests() {
    return Array.from(this.mergeRequests.values());
  }

  getMergeRequest(id: string) {
    const mr = this.mergeRequests.get(id);
    if (!mr) throw this.notFound('mergeRequest.notFound', 'Merge request not found');
    return mr;
  }

  createMergeRequest(payload: Pick<MergeRequest, 'title' | 'summary' | 'branch'>) {
    const id = uuid();
    const now = formatISO(new Date());
    const mr: MergeRequest = {
      id,
      title: payload.title,
      summary: payload.summary,
      status: 'Draft',
      branch: payload.branch,
      drift: false,
      lastSyncAt: now,
      storyIds: [],
      createdAt: now,
      updatedAt: now,
      version: 0
    };
    this.mergeRequests.set(id, mr);
    return mr;
  }

  updateMergeRequest(id: string, payload: Partial<MergeRequest>) {
    const mr = this.getMergeRequest(id);
    const updated = { ...mr, ...payload, updatedAt: formatISO(new Date()), version: mr.version + 1 };
    this.mergeRequests.set(id, updated);
    return updated;
  }

  updateMergeRequestStatus(id: string, status: MergeRequest['status']) {
    const mr = this.getMergeRequest(id);
    const allowed: Record<MergeRequest['status'], MergeRequest['status'][]> = {
      Draft: ['Ready', 'Closed'],
      Ready: ['InReview', 'Closed'],
      InReview: ['Merged', 'Closed'],
      Merged: [],
      Closed: []
    };
    if (!allowed[mr.status].includes(status)) {
      throw this.badRequest('mergeRequest.invalidStatus', `Cannot transition from ${mr.status} to ${status}`);
    }
    return this.updateMergeRequest(id, { status });
  }

  updateBranch(id: string) {
    const mr = this.getMergeRequest(id);
    return this.updateMergeRequest(id, { drift: !mr.drift, lastSyncAt: formatISO(new Date()) });
  }

  createStory(payload: {
    mrId: string;
    parentId: string | null;
    order: number;
    depth: number;
    title: string;
    asA: string;
    iWant: string;
    soThat: string;
  }): UserStory {
    const story = sharedCreateStory(payload);
    this.stories.set(story.id, story);
    if (!story.parentId) {
      const mr = this.getMergeRequest(story.mrId);
      mr.storyIds.push(story.id);
      mr.storyIds.sort((a, b) => this.stories.get(a)!.order - this.stories.get(b)!.order);
      this.mergeRequests.set(mr.id, mr);
    } else {
      const parent = this.stories.get(story.parentId);
      if (parent) {
        parent.childrenIds.push(story.id);
        parent.childrenIds.sort((a, b) => this.stories.get(a)!.order - this.stories.get(b)!.order);
      }
    }
    return story;
  }

  getStory(id: string) {
    const story = this.stories.get(id);
    if (!story) throw this.notFound('story.notFound', 'Story not found');
    return story;
  }

  listStoriesByMergeRequest(mrId: string) {
    return Array.from(this.stories.values()).filter((story) => story.mrId === mrId);
  }

  upsertStory(payload: Partial<UserStory> & { id?: string; mrId: string }) {
    const now = formatISO(new Date());
    if (payload.id) {
      const current = this.getStory(payload.id);
      const updated = {
        ...current,
        ...payload,
        updatedAt: now,
        version: current.version + 1
      } as UserStory;
      this.enforceDepth(updated);
      const { messages, canSave } = validateStoryInvest(
        updated,
        {
          tests: updated.testIds
            .map((id) => this.tests.get(id))
            .filter((test): test is AcceptanceTest => Boolean(test)),
          children: updated.childrenIds.map((id) => this.getStory(id))
        },
        { policy: INVEST_POLICY }
      );
      if (!canSave && INVEST_POLICY === 'block') {
        throw this.badRequest('story.investFailed', 'Story failed INVEST policy', messages);
      }
      this.stories.set(updated.id, updated);
      return updated;
    }
    const id = uuid();
    const story = {
      id,
      parentId: payload.parentId ?? null,
      mrId: payload.mrId,
      order: payload.order ?? 0,
      depth: payload.depth ?? 0,
      title: payload.title ?? 'New Story',
      asA: payload.asA ?? '',
      iWant: payload.iWant ?? '',
      soThat: payload.soThat ?? '',
      invest: payload.invest ?? {
        independent: true,
        negotiable: true,
        valuable: true,
        estimable: true,
        small: true,
        testable: false
      },
      estimateDays: payload.estimateDays,
      childrenIds: payload.childrenIds ?? [],
      testIds: payload.testIds ?? [],
      status: payload.status ?? 'Draft',
      createdAt: now,
      updatedAt: now,
      version: 0
    } satisfies UserStory;
    this.enforceDepth(story);
    this.stories.set(id, story);
    if (story.parentId) {
      const parent = this.getStory(story.parentId);
      parent.childrenIds.push(story.id);
    } else {
      const mr = this.getMergeRequest(story.mrId);
      mr.storyIds.push(story.id);
    }
    return story;
  }

  moveStory(id: string, payload: MovePayload) {
    const story = this.getStory(id);
    const targetParent = payload.parentId ? this.getStory(payload.parentId) : null;
    const newDepth = targetParent ? targetParent.depth + 1 : 0;
    if (newDepth > MAX_DEPTH) {
      throw this.badRequest('story.depthExceeded', 'Cannot move story beyond maximum depth');
    }
    if (payload.parentId === story.id) {
      throw this.badRequest('story.cycle', 'Story cannot be its own parent');
    }
    if (this.isDescendant(payload.parentId, story.id)) {
      throw this.badRequest('story.cycle', 'Cannot move story into its descendant');
    }

    if (story.parentId) {
      const oldParent = this.getStory(story.parentId);
      oldParent.childrenIds = oldParent.childrenIds.filter((childId) => childId !== story.id);
    } else {
      const mr = this.getMergeRequest(story.mrId);
      mr.storyIds = mr.storyIds.filter((rootId) => rootId !== story.id);
    }

    story.parentId = payload.parentId;
    story.depth = newDepth;
    story.order = payload.index;
    story.updatedAt = formatISO(new Date());

    if (targetParent) {
      targetParent.childrenIds.splice(payload.index, 0, story.id);
    } else {
      const mr = this.getMergeRequest(story.mrId);
      mr.storyIds.splice(payload.index, 0, story.id);
    }

    this.updateChildrenDepths(story.id, newDepth + 1);
    return story;
  }

  reorderStory(id: string, payload: ReorderPayload) {
    const story = this.getStory(id);
    story.order = payload.order;
    const siblings = story.parentId
      ? this.getStory(story.parentId).childrenIds
      : this.getMergeRequest(story.mrId).storyIds;
    const filtered = siblings.filter((sid) => sid !== story.id);
    filtered.splice(payload.order, 0, story.id);
    if (story.parentId) {
      const parent = this.getStory(story.parentId);
      parent.childrenIds = filtered;
    } else {
      const mr = this.getMergeRequest(story.mrId);
      mr.storyIds = filtered;
    }
    story.updatedAt = formatISO(new Date());
    return story;
  }

  deleteStory(id: string) {
    const story = this.getStory(id);
    if (story.childrenIds.length > 0) {
      story.childrenIds.forEach((childId) => this.deleteStory(childId));
    }
    story.testIds.forEach((testId) => this.tests.delete(testId));
    if (story.parentId) {
      const parent = this.getStory(story.parentId);
      parent.childrenIds = parent.childrenIds.filter((childId) => childId !== id);
    } else {
      const mr = this.getMergeRequest(story.mrId);
      mr.storyIds = mr.storyIds.filter((storyId) => storyId !== id);
    }
    this.stories.delete(id);
  }

  createAcceptanceTest(storyId: string, payload?: Partial<AcceptanceTest>) {
    const story = this.getStory(storyId);
    const now = formatISO(new Date());
    const test: AcceptanceTest = {
      ...sharedCreateAcceptanceTest(storyId),
      given: payload?.given ?? ['Given context'],
      when: payload?.when ?? ['When action occurs'],
      then: payload?.then ?? ['Then response within 3 seconds'],
      status: payload?.status ?? 'Draft',
      updatedAt: now
    };
    const validation = validateAcceptanceTest(test);
    if (!validation.measurability.ok && INVEST_POLICY === 'block') {
      throw this.badRequest('test.measurable', 'Acceptance test lacks measurable outcomes');
    }
    test.ambiguityFlags = validation.ambiguityFlags;
    this.tests.set(test.id, test);
    story.testIds.push(test.id);
    story.updatedAt = now;
    return test;
  }

  updateAcceptanceTest(id: string, payload: Partial<AcceptanceTest>) {
    const current = this.tests.get(id);
    if (!current) throw this.notFound('test.notFound', 'Acceptance test not found');
    const updated: AcceptanceTest = {
      ...current,
      ...payload,
      updatedAt: formatISO(new Date()),
      version: current.version + 1
    };
    const validation = validateAcceptanceTest(updated);
    if (!validation.measurability.ok && INVEST_POLICY === 'block') {
      throw this.badRequest('test.measurable', 'Acceptance test lacks measurable outcomes');
    }
    updated.ambiguityFlags = validation.ambiguityFlags;
    this.tests.set(updated.id, updated);
    return updated;
  }

  deleteTest(id: string) {
    const current = this.tests.get(id);
    if (!current) return;
    this.tests.delete(id);
    const story = this.getStory(current.storyId);
    story.testIds = story.testIds.filter((testId) => testId !== id);
  }

  getStoryTree(mrId: string) {
    const mr = this.getMergeRequest(mrId);
    const stories = this.listStoriesByMergeRequest(mrId);
    const tests = stories
      .flatMap((story) => story.testIds.map((id) => this.tests.get(id)))
      .filter((test): test is AcceptanceTest => Boolean(test));
    return { tree: rollupStatus(mr, stories, tests) };
  }

  getStoryPath(id: string) {
    const story = this.getStory(id);
    const path: UserStory[] = [story];
    let current = story;
    while (current.parentId) {
      current = this.getStory(current.parentId);
      path.unshift(current);
    }
    return path;
  }

  getChildren(id: string) {
    const story = this.getStory(id);
    return story.childrenIds.map((childId) => this.getStory(childId));
  }

  private enforceDepth(story: UserStory) {
    if (story.depth > MAX_DEPTH) {
      throw this.badRequest('story.depthExceeded', `Story depth exceeds maximum of ${MAX_DEPTH}`);
    }
  }

  private isDescendant(targetParentId: string | null, storyId: string): boolean {
    if (!targetParentId) return false;
    if (targetParentId === storyId) return true;
    const parent = this.getStory(targetParentId);
    if (!parent.parentId) return false;
    return this.isDescendant(parent.parentId, storyId);
  }

  private updateChildrenDepths(parentId: string, depth: number) {
    const parent = this.getStory(parentId);
    parent.childrenIds.forEach((childId) => {
      const child = this.getStory(childId);
      child.depth = depth;
      this.updateChildrenDepths(childId, depth + 1);
    });
  }

  private badRequest(code: string, message: string, details?: unknown): never {
    const error: ApiError = { code, message, details };
    throw error;
  }

  private notFound(code: string, message: string): never {
    const error: ApiError = { code, message };
    throw error;
  }
}

export const store = new InMemoryStore();
