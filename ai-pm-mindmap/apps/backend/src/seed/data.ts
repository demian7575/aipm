import { v4 as uuid } from 'uuid';
import {
  AcceptanceTest,
  MergeRequest,
  UserStory,
  createTimestamp,
} from '@ai-pm-mindmap/shared';

export interface SeedState {
  mergeRequests: MergeRequest[];
  stories: UserStory[];
  tests: AcceptanceTest[];
}

export const createSeedState = (): SeedState => {
  const now = createTimestamp();
  const mrId = uuid();
  const storyRootId = uuid();
  const storyChildId = uuid();
  const testId = uuid();
  const ambiguousTestId = uuid();
  const failingStoryId = uuid();

  const mergeRequests: MergeRequest[] = [
    {
      id: mrId,
      title: 'Mindmap baseline experience',
      description: 'Initial MR containing outline and mindmap implementations.',
      status: 'open',
      repository: 'ai/pm-mindmap',
      branch: 'feature/mindmap-baseline',
      drifted: true,
      lastSyncAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      createdAt: now,
      updatedAt: now,
    },
  ];

  const stories: UserStory[] = [
    {
      id: storyRootId,
      mrId,
      parentId: null,
      title: 'Manage backlog with keyboard accessible tree',
      asA: 'As a product manager',
      iWant: 'I want to expand and collapse the tree quickly',
      soThat: 'So that I can refine stories without using a mouse',
      status: 'in-progress',
      estimateDays: 1.5,
      order: 0,
      depth: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: failingStoryId,
      mrId,
      parentId: storyRootId,
      title: 'Mindmap radial view is fast and optimal',
      asA: 'As a stakeholder',
      iWant: 'I want the mindmap to render asap for everyone',
      soThat: 'So that it feels great',
      status: 'backlog',
      estimateDays: 5,
      order: 0,
      depth: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: storyChildId,
      mrId,
      parentId: storyRootId,
      title: 'Link tests to stories in outline view',
      asA: 'As a QA engineer',
      iWant: 'I want to attach acceptance tests to user stories',
      soThat: 'So that I can verify requirements efficiently',
      status: 'in-progress',
      estimateDays: 1,
      order: 1,
      depth: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const tests: AcceptanceTest[] = [
    {
      id: testId,
      storyId: storyChildId,
      title: 'Outline allows linking tests',
      given: 'Given a story in outline mode',
      when: 'When I add an acceptance test',
      then: 'Then it appears in the list within 5 seconds',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ambiguousTestId,
      storyId: failingStoryId,
      title: 'Mindmap renders optimally',
      given: 'Given a large backlog',
      when: 'When I open the mindmap quickly',
      then: 'Then it should feel optimal and fast',
      status: 'failed',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      storyId: failingStoryId,
      title: 'Keyboard navigation',
      given: 'Given the tree view',
      when: 'When I press enter',
      then: 'Then the edit mode toggles',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    },
  ];

  return { mergeRequests, stories, tests };
};
