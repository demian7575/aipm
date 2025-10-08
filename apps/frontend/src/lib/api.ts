import type { AcceptanceTest, MergeRequest, RollupResult, UserStory } from '@ai-pm/shared';

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...init
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }
  return response.json() as Promise<T>;
}

export const api = {
  async listMergeRequests(): Promise<MergeRequest[]> {
    return request('/api/merge-requests');
  },
  async getStories(mrId: string): Promise<UserStory[]> {
    return request(`/api/stories?mrId=${mrId}`);
  },
  async getStoryTree(mrId: string): Promise<{ tree: RollupResult[] }> {
    return request(`/api/stories/tree?mrId=${mrId}`);
  },
  async createStory(payload: {
    mrId: string;
    parentId: string | null;
    order: number;
    depth: number;
    title: string;
    asA: string;
    iWant: string;
    soThat: string;
  }) {
    return request<UserStory>('/api/stories', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async updateStory(story: UserStory) {
    return request<UserStory>(`/api/stories/${story.id}`, {
      method: 'PUT',
      body: JSON.stringify(story)
    });
  },
  async moveStory(id: string, payload: { parentId: string | null; index: number }) {
    return request<UserStory>(`/api/stories/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },
  async reorderStory(id: string, order: number) {
    return request<UserStory>(`/api/stories/${id}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ order })
    });
  },
  async createTest(storyId: string) {
    return request<AcceptanceTest>('/api/tests', {
      method: 'POST',
      body: JSON.stringify({ storyId })
    });
  },
  async updateTest(test: AcceptanceTest) {
    return request<AcceptanceTest>(`/api/tests/${test.id}`, {
      method: 'PUT',
      body: JSON.stringify(test)
    });
  },
  async deleteTest(id: string) {
    return request<{ ok: boolean }>(`/api/tests/${id}`, { method: 'DELETE' });
  },
  async updateBranch(mrId: string) {
    return request(`/api/merge-requests/${mrId}/update-branch`, { method: 'POST' });
  }
};
