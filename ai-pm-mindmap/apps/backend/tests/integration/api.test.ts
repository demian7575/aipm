import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { createApp } from '../../src/app';
import { store } from '../../src/repositories/inMemoryStore';

describe('API integration', () => {
  const app = createApp();

  beforeEach(() => {
    store.reset();
  });

  it('returns merge requests snapshot', async () => {
    const res = await request(app).get('/api/merge-requests');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('moves story and prevents cycles', async () => {
    const res = await request(app)
      .patch('/api/stories/story-1/move')
      .send({ parentId: 'story-2', index: 0 });
    expect(res.status).toBe(409);
  });

  it('toggles drift', async () => {
    const res = await request(app).post('/api/merge-requests/mr-1/update-branch');
    expect(res.status).toBe(200);
    expect(res.body.drift).toBe(true);
    expect(res.body.lastSyncAt).toBeTruthy();
  });
});
