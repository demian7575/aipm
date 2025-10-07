import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryStore, DEFAULT_DEPTH_LIMIT } from './state.js';

let store: InMemoryStore;

beforeEach(() => {
  store = new InMemoryStore();
});

describe('InMemoryStore', () => {
  it('creates stories respecting depth', () => {
    const mr = store.listMergeRequests()[0];
    const root = store.createStory({
      mrId: mr.id,
      parentId: null,
      title: 'Root story',
      asA: 'As a user',
      iWant: 'I want to manage tasks',
      soThat: 'So that I can stay productive',
      status: 'backlog',
      estimateDays: 1,
    });

    expect(root.depth).toBe(0);

    const child = store.createStory({
      mrId: mr.id,
      parentId: root.id,
      title: 'Child story',
      asA: 'As a teammate',
      iWant: 'I want a checklist',
      soThat: 'So that nothing is missed',
      status: 'backlog',
      estimateDays: 1,
    });

    expect(child.depth).toBe(1);
  });

  it('prevents cycles when moving stories', () => {
    const mr = store.listMergeRequests()[0];
    const parent = store.createStory({
      mrId: mr.id,
      parentId: null,
      title: 'Parent',
      asA: 'As a user',
      iWant: 'I want structure',
      soThat: 'So that I can plan',
      status: 'backlog',
      estimateDays: 1,
    });
    const child = store.createStory({
      mrId: mr.id,
      parentId: parent.id,
      title: 'Child',
      asA: 'As a user',
      iWant: 'I want clarity',
      soThat: 'So that I can deliver',
      status: 'backlog',
      estimateDays: 1,
    });

    expect(() => store.moveStory(parent.id, child.id, 0)).toThrow('Cycle detected');
  });

  it('enforces depth limit', () => {
    const mr = store.listMergeRequests()[0];
    let parentId: string | null = null;
    for (let depth = 0; depth <= DEFAULT_DEPTH_LIMIT; depth += 1) {
      const story = store.createStory({
        mrId: mr.id,
        parentId,
        title: `Depth ${depth}`,
        asA: 'As a user',
        iWant: 'I want nested stories',
        soThat: 'So that I can represent detail',
        status: 'backlog',
        estimateDays: 1,
      });
      parentId = story.id;
    }

    expect(() =>
      store.createStory({
        mrId: mr.id,
        parentId,
        title: 'Too deep',
        asA: 'As a user',
        iWant: 'I want more depth',
        soThat: 'So that I can test limits',
        status: 'backlog',
        estimateDays: 1,
      }),
    ).toThrow(/Depth limit/);
  });
});
