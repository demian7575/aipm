import { AppState, MergeRequest, UserStory, AcceptanceTest } from './types';
import { createId } from '../utils/id';

export type AppAction =
  | { type: 'selectMergeRequest'; mergeRequestId: string }
  | { type: 'selectStory'; storyId: string | null }
  | { type: 'createMergeRequest'; title: string; summary: string }
  | {
      type: 'createStory';
      mergeRequestId: string;
      parentStoryId: string | null;
      asA: string;
      iWant: string;
      soThat: string;
      notes?: string;
    }
  | {
      type: 'createAcceptanceTest';
      storyId: string;
      title: string;
      given: string;
      when: string;
      then: string;
      notes?: string;
    }
  | { type: 'toggleStoryChildren'; storyId: string }
  | { type: 'toggleAcceptanceTests'; storyId: string };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'selectMergeRequest': {
      return {
        ...state,
        selectedMergeRequestId: action.mergeRequestId,
        selectedStoryId: state.mergeRequests[action.mergeRequestId]?.storyIds[0] ?? null
      };
    }
    case 'selectStory': {
      return { ...state, selectedStoryId: action.storyId };
    }
    case 'createMergeRequest': {
      const id = createId('mr');
      const mergeRequest: MergeRequest = {
        id,
        title: action.title,
        summary: action.summary,
        status: 'draft',
        storyIds: []
      };
      return {
        ...state,
        mergeRequests: { ...state.mergeRequests, [id]: mergeRequest },
        selectedMergeRequestId: id,
        selectedStoryId: null
      };
    }
    case 'createStory': {
      const storyId = createId('story');
      const story: UserStory = {
        id: storyId,
        mergeRequestId: action.mergeRequestId,
        parentId: action.parentStoryId,
        asA: action.asA,
        iWant: action.iWant,
        soThat: action.soThat,
        notes: action.notes,
        status: 'draft',
        acceptanceTestIds: [],
        childStoryIds: []
      };

      const mergeRequests = { ...state.mergeRequests };
      const userStories = { ...state.userStories, [storyId]: story };

      if (action.parentStoryId) {
        const parent = userStories[action.parentStoryId];
        userStories[action.parentStoryId] = {
          ...parent,
          childStoryIds: [...parent.childStoryIds, storyId]
        };
      } else {
        const mr = mergeRequests[action.mergeRequestId];
        mergeRequests[action.mergeRequestId] = {
          ...mr,
          storyIds: [...mr.storyIds, storyId]
        };
      }

      return {
        ...state,
        mergeRequests,
        userStories,
        selectedStoryId: storyId
      };
    }
    case 'createAcceptanceTest': {
      const acceptanceId = createId('at');
      const test: AcceptanceTest = {
        id: acceptanceId,
        storyId: action.storyId,
        title: action.title,
        given: action.given,
        when: action.when,
        then: action.then,
        notes: action.notes,
        status: 'draft'
      };

      const acceptanceTests = {
        ...state.acceptanceTests,
        [acceptanceId]: test
      };

      const story = state.userStories[action.storyId];
      const userStories = {
        ...state.userStories,
        [action.storyId]: {
          ...story,
          acceptanceTestIds: [...story.acceptanceTestIds, acceptanceId]
        }
      };

      return {
        ...state,
        acceptanceTests,
        userStories
      };
    }
    case 'toggleStoryChildren': {
      const next = { ...state.collapsedStoryChildren };
      next[action.storyId] = !next[action.storyId];
      return { ...state, collapsedStoryChildren: next };
    }
    case 'toggleAcceptanceTests': {
      const next = { ...state.collapsedAcceptanceTests };
      next[action.storyId] = !next[action.storyId];
      return { ...state, collapsedAcceptanceTests: next };
    }
    default:
      return state;
  }
}
