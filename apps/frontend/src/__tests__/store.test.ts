import { describe, it, expect, beforeEach } from 'vitest';
import { useStoriesStore, getAllStoryIds } from '../store/useStoriesStore';
import type { StoryTreeNode } from '@ai-pm/shared/types';

describe('useStoriesStore', () => {
  beforeEach(() => {
    useStoriesStore.setState({ tree: [], expandedIds: [], selectedStoryId: undefined, viewMode: 'outline' });
  });

  it('collects ids across the tree', () => {
    const tree: StoryTreeNode[] = [
      {
        story: { id: '1', mergeRequestId: 'MR', title: 'Root', role: '', goal: '', benefit: '', status: 'draft', order: 0 },
        children: [
          {
            story: {
              id: '2',
              mergeRequestId: 'MR',
              parentId: '1',
              title: 'Child',
              role: '',
              goal: '',
              benefit: '',
              status: 'draft',
              order: 0
            },
            children: [],
            acceptanceTests: [],
            rollup: { total: 1, done: 0, blocked: 0 }
          }
        ],
        acceptanceTests: [],
        rollup: { total: 2, done: 0, blocked: 0 }
      }
    ];
    expect(getAllStoryIds(tree)).toEqual(['1', '2']);
  });
});
