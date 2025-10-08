import type { FastifyInstance } from 'fastify';
import { store } from '../store.js';

export function registerStoryRoutes(server: FastifyInstance) {
  server.get('/api/stories', async (request) => {
    const { mrId } = request.query as { mrId: string };
    return store.listStoriesByMergeRequest(mrId);
  });

  server.get('/api/stories/tree', async (request) => {
    const { mrId } = request.query as { mrId: string };
    return store.getStoryTree(mrId);
  });

  server.get('/api/stories/:id', async (request) => {
    const { id } = request.params as { id: string };
    return store.getStory(id);
  });

  server.post('/api/stories', async (request) => {
    const body = request.body as {
      mrId: string;
      parentId: string | null;
      order: number;
      depth: number;
      title: string;
      asA: string;
      iWant: string;
      soThat: string;
    };
    return store.createStory(body);
  });

  server.put('/api/stories/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    return store.upsertStory({ ...body, id });
  });

  server.delete('/api/stories/:id', async (request) => {
    const { id } = request.params as { id: string };
    store.deleteStory(id);
    return { ok: true };
  });

  server.patch('/api/stories/:id/status', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status: 'Draft' | 'Ready' | 'Approved' };
    const story = store.getStory(id);
    story.status = body.status;
    return store.upsertStory({ ...story });
  });

  server.patch('/api/stories/:id/move', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { parentId: string | null; index: number };
    return store.moveStory(id, body);
  });

  server.patch('/api/stories/:id/reorder', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { order: number };
    return store.reorderStory(id, body);
  });

  server.get('/api/stories/:id/path', async (request) => {
    const { id } = request.params as { id: string };
    return store.getStoryPath(id);
  });

  server.get('/api/stories/:id/children', async (request) => {
    const { id } = request.params as { id: string };
    return store.getChildren(id);
  });
}
