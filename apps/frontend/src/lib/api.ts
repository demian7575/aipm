import axios from 'axios';
import type { MergeRequest, Story, AcceptanceTest, StoryTreeNode } from '@ai-pm/shared/types';

const api = axios.create({
  baseURL: '/api'
});

export async function fetchMergeRequests(): Promise<MergeRequest[]> {
  const { data } = await api.get<MergeRequest[]>('/merge-requests');
  return data;
}

export async function fetchStoryTree(mrId: string, depth?: number): Promise<StoryTreeNode[]> {
  const { data } = await api.get<{ data: StoryTreeNode[] }>('/stories/tree', { params: { mrId, depth } });
  return data.data;
}

export async function fetchStory(storyId: string): Promise<{ data: Story; validation: { warnings: any[]; errors: any[] } }> {
  const { data } = await api.get(`/stories/${storyId}`);
  return data;
}

export async function fetchMergeRequestState(): Promise<{
  mergeRequests: MergeRequest[];
  stories: Story[];
  tests: AcceptanceTest[];
}> {
  const { data } = await api.get('/state');
  return data;
}

export async function moveStory(id: string, parentId: string | null, index: number) {
  const { data } = await api.patch(`/stories/${id}/move`, { parentId, index });
  return data;
}

export async function reorderStory(id: string, order: string[]) {
  const { data } = await api.patch(`/stories/${id}/reorder`, { order });
  return data;
}

export async function updateBranch(id: string) {
  const { data } = await api.post(`/merge-requests/${id}/update-branch`);
  return data;
}

export default api;
