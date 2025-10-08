// Generated via openapi-typescript from backend OpenAPI schema.
// Run `npm run generate:openapi` to update.
export interface MergeRequest {
  id: string;
  title: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'review' | 'done' | 'blocked';
  repo: string;
  branch: string;
  drift?: boolean;
  lastSyncAt?: string | null;
}

export interface Story {
  id: string;
  mergeRequestId: string;
  parentId?: string | null;
  title: string;
  role: string;
  goal: string;
  benefit: string;
  status?: 'draft' | 'in_progress' | 'review' | 'done' | 'blocked';
  order?: number;
}

export interface AcceptanceTest {
  id: string;
  storyId: string;
  given: string;
  when: string;
  then: string;
  status?: 'draft' | 'in_progress' | 'review' | 'done' | 'blocked';
}

export interface StoryTreeNode {
  story: Story;
  children: StoryTreeNode[];
  acceptanceTests: AcceptanceTest[];
  rollup: { total: number; done: number; blocked: number };
}
