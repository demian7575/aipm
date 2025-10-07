import axios from 'axios';
import {
  AcceptanceTest,
  MergeRequest,
  UserStory,
  buildOpenApiDocument
} from '@ai-pm-mindmap/shared';

export const api = axios.create({
  baseURL: '/api'
});

export async function fetchMergeRequests(): Promise<MergeRequest[]> {
  const { data } = await api.get<MergeRequest[]>('/merge-requests');
  return data;
}

export async function fetchStories(): Promise<UserStory[]> {
  const { data } = await api.get<UserStory[]>('/stories');
  return data;
}

export async function fetchTests(): Promise<AcceptanceTest[]> {
  const { data } = await api.get<AcceptanceTest[]>('/tests');
  return data;
}

export async function updateBranch(id: string) {
  const { data } = await api.post(`/merge-requests/${id}/update-branch`);
  return data as MergeRequest;
}

export async function createMergeRequest(payload: Partial<MergeRequest>) {
  const { data } = await api.post<MergeRequest>('/merge-requests', payload);
  return data;
}

export async function createStory(payload: Partial<UserStory>) {
  const { data } = await api.post<UserStory>('/stories', payload);
  return data;
}

export async function updateStory(id: string, payload: Partial<UserStory>) {
  const { data } = await api.put<UserStory>(`/stories/${id}`, payload);
  return data;
}

export async function moveStory(id: string, parentId: string | null, index: number) {
  const { data } = await api.patch<UserStory>(`/stories/${id}/move`, { parentId, index });
  return data;
}

export async function deleteStory(id: string) {
  await api.delete(`/stories/${id}`);
}

export async function createTest(payload: Partial<AcceptanceTest>) {
  const { data } = await api.post<AcceptanceTest>('/tests', payload);
  return data;
}

export async function updateTest(id: string, payload: Partial<AcceptanceTest>) {
  const { data } = await api.put<AcceptanceTest>(`/tests/${id}`, payload);
  return data;
}

export async function deleteTest(id: string) {
  await api.delete(`/tests/${id}`);
}

export async function reseed() {
  await api.post('/reset');
}

export async function fetchOpenApi() {
  const { data } = await api.get('/openapi.json');
  return data;
}

export const openApiDocument = buildOpenApiDocument();
