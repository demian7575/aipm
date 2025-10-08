import type { FastifyInstance } from 'fastify';
import { store } from '../store.js';

export function registerTestRoutes(server: FastifyInstance) {
  server.post('/api/tests', async (request) => {
    const body = request.body as { storyId: string; given?: string[]; when?: string[]; then?: string[] };
    return store.createAcceptanceTest(body.storyId, body);
  });

  server.put('/api/tests/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    return store.updateAcceptanceTest(id, body);
  });

  server.delete('/api/tests/:id', async (request) => {
    const { id } = request.params as { id: string };
    store.deleteTest(id);
    return { ok: true };
  });
}
