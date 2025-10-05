import { AppState } from './types';
import { createId } from '../utils/id';

const mrId = createId('mr');
const storyRoot = createId('story');
const childStory = createId('story');
const acceptanceId = createId('at');

export const initialState: AppState = {
  mergeRequests: {
    [mrId]: {
      id: mrId,
      title: 'Bootstrap AI Project Manager',
      summary:
        'Initial MR to stand up the AI-assisted planning workspace with mindmap visualization and INVEST guidance.',
      status: 'active',
      storyIds: [storyRoot]
    }
  },
  userStories: {
    [storyRoot]: {
      id: storyRoot,
      mergeRequestId: mrId,
      parentId: null,
      asA: 'As a delivery lead',
      iWant: 'I want to break MR goals into INVEST-compliant user stories',
      soThat: 'So that the team can execute iteratively with visible acceptance tests',
      notes: 'Seed story guiding the creation workflow.',
      status: 'grooming',
      acceptanceTestIds: [acceptanceId],
      childStoryIds: [childStory]
    },
    [childStory]: {
      id: childStory,
      mergeRequestId: mrId,
      parentId: storyRoot,
      asA: 'As a product owner',
      iWant: 'I want to record acceptance tests in Given-When-Then format',
      soThat: 'So that testers know exactly how to validate the feature',
      status: 'draft',
      acceptanceTestIds: [],
      childStoryIds: []
    }
  },
  acceptanceTests: {
    [acceptanceId]: {
      id: acceptanceId,
      storyId: storyRoot,
      title: 'Mindmap snapshot renders guidance',
      given: 'Given the planning workspace is open on the MR root',
      when: 'When a facilitator reviews the mindmap',
      then: 'Then they see INVEST guidance and acceptance test links for every story',
      notes: 'Demonstrates hierarchal traceability',
      status: 'in-progress'
    }
  },
  selectedMergeRequestId: mrId,
  selectedStoryId: storyRoot
};
