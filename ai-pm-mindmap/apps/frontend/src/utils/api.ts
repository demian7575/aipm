import {
  AcceptanceTest,
  MergeRequest,
  UserStory,
} from '@ai-pm-mindmap/shared';

export interface StoryNode extends UserStory {
  children: StoryNode[];
  tests: AcceptanceTest[];
  analysis: {
    invest: any;
    ambiguity: any;
  };
}

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const handleError = async (response: Response) => {
  let message = 'Request failed';
  try {
    const data = await response.json();
    if (data?.message) {
      message = data.message;
    }
  } catch (error) {
    // ignore
  }
  throw new Error(message);
};

export const api = {
  async listMergeRequests(): Promise<MergeRequest[]> {
    const response = await fetch('/api/merge-requests');
    if (!response.ok) await handleError(response);
    return response.json();
  },
  async listStories(mrId: string): Promise<StoryNode[]> {
    const response = await fetch(`/api/stories/tree?mrId=${mrId}`);
    if (!response.ok) await handleError(response);
    return response.json();
  },
  async getStory(id: string) {
    const response = await fetch(`/api/stories/${id}`);
    if (!response.ok) await handleError(response);
    return response.json();
  },
  async createStory(payload: Partial<UserStory>) {
    const response = await fetch('/api/stories', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) await handleError(response);
    return response.json();
  },
  async updateStory(id: string, payload: Partial<UserStory>) {
    const response = await fetch(`/api/stories/${id}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) await handleError(response);
    return response.json();
  },
  async deleteStory(id: string) {
    const response = await fetch(`/api/stories/${id}`, { method: 'DELETE' });
    if (!response.ok) await handleError(response);
  },
  async moveStory(id: string, payload: { parentId: string | null; index: number }) {
    const response = await fetch(`/api/stories/${id}/move`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) await handleError(response);
    return response.json();
  },
  async updateStoryStatus(id: string, status: UserStory['status']) {
    const response = await fetch(`/api/stories/${id}/status`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ status }),
    });
    if (!response.ok) await handleError(response);
    return response.json();
  },
  async reorderStory(id: string, order: string[]) {
    const response = await fetch(`/api/stories/${id}/reorder`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ order }),
    });
    if (!response.ok) await handleError(response);
    return response.json();
  },
  async createTest(payload: Partial<AcceptanceTest>) {
    const response = await fetch('/api/tests', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    if (!response.ok) await handleError(response);
    return response.json();
  },
  async toggleDrift(mrId: string) {
    const response = await fetch(`/api/merge-requests/${mrId}/update-branch`, {
      method: 'POST',
    });
    if (!response.ok) await handleError(response);
    return response.json();
  },
};

export const flattenTree = (nodes: StoryNode[]): StoryNode[] => {
  const result: StoryNode[] = [];
  const visit = (node: StoryNode) => {
    result.push(node);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return result;
};
