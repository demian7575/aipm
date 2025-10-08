import type { FastifyInstance } from 'fastify';
import { store } from '../store.js';

export function registerMergeRequestRoutes(server: FastifyInstance) {
  server.get('/api/merge-requests', async () => store.listMergeRequests());

  server.post('/api/merge-requests', async (request) => {
    const body = request.body as { title: string; summary: string; branch: string };
    return store.createMergeRequest(body);
  });

  server.get('/api/merge-requests/:id', async (request) => {
    const { id } = request.params as { id: string };
    return store.getMergeRequest(id);
  });

  server.put('/api/merge-requests/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<ReturnType<typeof store.getMergeRequest>>;
    return store.updateMergeRequest(id, body as any);
  });

  server.patch('/api/merge-requests/:id/status', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status: 'Draft' | 'Ready' | 'InReview' | 'Merged' | 'Closed' };
    return store.updateMergeRequestStatus(id, body.status);
  });

  server.post('/api/merge-requests/:id/update-branch', async (request) => {
    const { id } = request.params as { id: string };
    return store.updateBranch(id);
  });
}
