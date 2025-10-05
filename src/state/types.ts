export type AcceptanceStatus = 'draft' | 'in-progress' | 'passed' | 'blocked';

export interface AcceptanceTest {
  id: string;
  storyId: string;
  title: string;
  given: string;
  when: string;
  then: string;
  notes?: string;
  status: AcceptanceStatus;
}

export type StoryStatus = 'draft' | 'grooming' | 'ready' | 'in-review' | 'done';

export interface UserStory {
  id: string;
  mergeRequestId: string;
  parentId: string | null;
  asA: string;
  iWant: string;
  soThat: string;
  notes?: string;
  status: StoryStatus;
  acceptanceTestIds: string[];
  childStoryIds: string[];
}

export type MergeRequestStatus = 'draft' | 'active' | 'ready-for-merge';

export interface MergeRequest {
  id: string;
  title: string;
  summary: string;
  status: MergeRequestStatus;
  storyIds: string[];
}

export interface AppState {
  mergeRequests: Record<string, MergeRequest>;
  userStories: Record<string, UserStory>;
  acceptanceTests: Record<string, AcceptanceTest>;
  selectedMergeRequestId: string | null;
  selectedStoryId: string | null;
  collapsedStoryChildren: Record<string, boolean>;
  collapsedAcceptanceTests: Record<string, boolean>;
}
