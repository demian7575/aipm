import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { createApp } from './app.js';
import { store } from './repositories/state.js';

const app = createApp();

beforeEach(() => {
  store.reset();
});

describe('API integration', () => {
  it('lists merge requests', async () => {
    const response = await request(app).get('/api/merge-requests');
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('creates story and generates analysis', async () => {
    const mr = store.listMergeRequests()[0];
    const response = await request(app).post('/api/stories').send({
      mrId: mr.id,
      title: 'Create accessible shortcuts',
      asA: 'As a PM',
      iWant: 'I want keyboard shortcuts',
      soThat: 'So that I can navigate faster',
      status: 'backlog',
      estimateDays: 1,
    });
    expect(response.status).toBe(201);
    expect(response.body.analysis.invest.summary.total).toBeGreaterThan(0);
  });

  it('prevents invalid move by cycle', async () => {
    const stories = store.listStories();
    const parent = stories.find((story) => story.parentId === null)!;
    const child = store.createStory({
      mrId: parent.mrId,
      parentId: parent.id,
      title: 'Child item',
      asA: 'As a user',
      iWant: 'I want nested elements',
      soThat: 'So that structure is clear',
      status: 'backlog',
      estimateDays: 1,
    });

    const response = await request(app)
      .patch(`/api/stories/${parent.id}/move`)
      .send({ parentId: child.id, index: 0 });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Cycle/);
  });
});
