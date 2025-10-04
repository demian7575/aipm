export type NodeType = 'MR' | 'UserStory' | 'AcceptanceTest';

export type AcceptanceTestStatus = 'draft' | 'ready' | 'blocked' | 'in-review' | 'passed';

export interface AcceptanceTestDraft {
  id: string;
  parentUserStoryId: string;
  name: string;
  description: string;
  status: AcceptanceTestStatus;
  given: string;
  when: string;
  then: string;
  lastRunAt?: string;
  lastRunNotes?: string;
}

export interface UserStoryNode {
  id: string;
  parentId: string | null;
  type: Extract<NodeType, 'UserStory'>;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  status: 'draft' | 'in-progress' | 'ready-for-test' | 'done';
  acceptanceTests: AcceptanceTestDraft[];
  children: UserStoryNode[];
}

export interface MergeRequestRoot {
  id: string;
  type: Extract<NodeType, 'MR'>;
  title: string;
  description: string;
  status: 'draft' | 'in-progress' | 'ready-for-review' | 'passed';
  userStories: UserStoryNode[];
  createdAt: string;
  updatedAt: string;
}

export interface AcceptanceTestLogEntry {
  id: string;
  testId: string;
  userStoryId: string;
  executedAt: string;
  tester: string;
  outcome: 'passed' | 'failed' | 'blocked';
  notes?: string;
}

export interface MindmapSnapshot {
  root: MergeRequestRoot;
  acceptanceTestLog: AcceptanceTestLogEntry[];
}
