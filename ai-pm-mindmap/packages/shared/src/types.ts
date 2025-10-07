export type MergeRequestStatus = 'open' | 'merged' | 'closed';
export type UserStoryStatus = 'draft' | 'ready' | 'in-progress' | 'done' | 'blocked';
export type AcceptanceTestStatus = 'pending' | 'passing' | 'failing';

export interface MergeRequest {
  id: string;
  title: string;
  description: string;
  repository: string;
  branch: string;
  status: MergeRequestStatus;
  drift: boolean;
  lastSyncAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStory {
  id: string;
  mrId: string;
  parentId: string | null;
  title: string;
  role: string;
  action: string;
  reason: string;
  gwt: {
    given: string;
    when: string;
    then: string;
  };
  estimateDays: number;
  status: UserStoryStatus;
  depth: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptanceTest {
  id: string;
  storyId: string;
  title: string;
  steps: string[];
  status: AcceptanceTestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InvestResult {
  compliant: boolean;
  issues: string[];
}

export interface AmbiguityFlag {
  text: string;
  reason: 'ambiguous-term' | 'missing-measurement';
}

export interface StoryAnalysis {
  invest: InvestResult;
  ambiguity: AmbiguityFlag[];
}

export interface TestAnalysis {
  ambiguity: AmbiguityFlag[];
}
