import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import { createApp } from '../../src/app';
import { store } from '../../src/repositories/inMemoryStore';

const app = createApp();

beforeAll(() => {
  store.reset();
});

describe('API integration', () => {
  it('lists merge requests', async () => {
    const res = await request(app).get('/api/merge-requests');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('moves a story', async () => {
    const stories = store.listStories();
    const child = stories.find((s) => s.parentId !== null) ?? stories[0];
    const res = await request(app)
      .patch(`/api/stories/${child.id}/move`)
      .send({ parentId: null, index: 0 });
    expect(res.status).toBe(200);
  });

  it('prevents ambiguous acceptance tests', async () => {
    const story = store.listStories()[0];
    const res = await request(app).post('/api/tests').send({
      storyId: story.id,
      title: 'Ambiguous test',
      steps: ['Do it fast']
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });
});
