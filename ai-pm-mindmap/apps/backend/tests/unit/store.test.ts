import { describe, expect, it, beforeEach } from 'vitest';
import { store } from '../../src/repositories/inMemoryStore';

beforeEach(() => {
  store.reset();
});

describe('InMemoryStore', () => {
  it('creates merge request', () => {
    const result = store.createMergeRequest({
      title: 'New MR',
      description: 'Test',
      repository: 'repo/test',
      branch: 'feature/x',
      status: 'open'
    });
    expect(result.id).toMatch(/mr-/);
  });

  it('enforces depth limit when creating stories', () => {
    const [rootStory] = store.listStories().filter((story) => story.parentId === null);
    const child = store.createStory({
      mrId: rootStory.mrId,
      parentId: rootStory.id,
      title: 'As an admin I want to add depth so that it works',
      role: 'As an admin',
      action: 'I want to add depth so that it works',
      reason: 'So that it works',
      gwt: {
        given: 'Given a thing',
        when: 'When action happens',
        then: 'Then response returns in 2 seconds'
      },
      estimateDays: 1,
      status: 'draft'
    });
    expect(child.depth).toBe(rootStory.depth + 1);
  });

  it('prevents invalid story transitions', () => {
    const story = store.listStories()[0];
    expect(() => store.updateStoryStatus(story.id, 'done')).toThrow();
  });
});
