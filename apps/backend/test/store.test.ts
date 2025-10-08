import { beforeEach, describe, expect, it } from 'vitest';
import { store } from '../src/store.js';

let mrId: string;

beforeEach(() => {
  const [mr] = store.listMergeRequests();
  mrId = mr.id;
});

describe('InMemoryStore', () => {
  it('prevents moving a story beyond max depth', () => {
    const stories = store.listStoriesByMergeRequest(mrId);
    const child = stories.find((story) => story.title.startsWith('US1-1'))!;
    const grandchild = store.createStory({
      mrId,
      parentId: child.id,
      order: 0,
      depth: child.depth + 1,
      title: 'Grandchild depth test',
      asA: 'As a user',
      iWant: 'Depth guard',
      soThat: 'I avoid cycles'
    });
    expect(() => store.moveStory(child.id, { parentId: grandchild.id, index: 0 })).toThrowError();
  });

  it('updates merge request drift when branch updated', () => {
    const mr = store.listMergeRequests()[0];
    const updated = store.updateBranch(mr.id);
    expect(updated.drift).not.toBe(mr.drift);
  });
});
