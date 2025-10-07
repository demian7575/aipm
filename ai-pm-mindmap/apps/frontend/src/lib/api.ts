import type { AcceptanceTest, MergeRequest, UserStory } from '@ai-pm-mindmap/shared';

const headers = {
  'Content-Type': 'application/json'
};

export interface AppStateSnapshot {
  mergeRequests: MergeRequest[];
  stories: UserStory[];
  tests: AcceptanceTest[];
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? 'Request failed');
  }
  return (await response.json()) as T;
}

export async function fetchState(): Promise<AppStateSnapshot> {
  const res = await fetch('/api/state');
  return handle<AppStateSnapshot>(res);
}

export async function fetchStoryTree(mrId: string) {
  const res = await fetch(`/api/stories/tree?mrId=${encodeURIComponent(mrId)}`);
  return handle<any[]>(res);
}

export async function updateBranch(id: string) {
  const res = await fetch(`/api/merge-requests/${id}/update-branch`, {
    method: 'POST',
    headers
  });
  return handle<MergeRequest>(res);
}

export async function createStory(payload: Partial<UserStory>) {
  const res = await fetch('/api/stories', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  return handle<UserStory>(res);
}

export async function createTest(payload: Partial<AcceptanceTest>) {
  const res = await fetch('/api/tests', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  return handle<AcceptanceTest>(res);
}
