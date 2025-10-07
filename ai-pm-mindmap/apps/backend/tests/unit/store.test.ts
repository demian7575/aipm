import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/repositories/inMemoryStore';

describe('InMemoryStore', () => {
  it('prevents depth over limit', () => {
    const store = new InMemoryStore();
    const parent = store.getStory('story-1');
    expect(() =>
      store.createStory({
        id: 'story-3',
        mrId: parent.mrId,
        parentId: 'story-1',
        title: 'As a user I want nested story',
        role: 'As a user',
        action: 'I want nested',
        reason: 'So that I can test',
        gwt: { given: 'Given', when: 'When', then: 'Then within 5 seconds' },
        estimateDays: 1,
        status: 'draft'
      })
    ).not.toThrow();

    expect(() =>
      store.createStory({
        id: 'story-4',
        mrId: parent.mrId,
        parentId: 'story-3',
        title: 'As a user I want deeper',
        role: 'As a user',
        action: 'I want deeper',
        reason: 'So that depth is big',
        gwt: { given: 'Given', when: 'When', then: 'Then within 5 seconds' },
        estimateDays: 1,
        status: 'draft'
      })
    ).not.toThrow();

    expect(() =>
      store.createStory({
        id: 'story-5',
        mrId: parent.mrId,
        parentId: 'story-4',
        title: 'As a user I want too deep',
        role: 'As a user',
        action: 'I want too deep',
        reason: 'So that depth fails',
        gwt: { given: 'Given', when: 'When', then: 'Then within 5 seconds' },
        estimateDays: 1,
        status: 'draft'
      })
    ).toThrow();
  });

  it('blocks invalid story status transitions', () => {
    const store = new InMemoryStore();
    expect(() => store.updateStoryStatus('story-1', 'done')).toThrow();
  });
});
