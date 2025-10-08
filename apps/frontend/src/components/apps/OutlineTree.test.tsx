import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useWorkspaceStore } from '../../state/useWorkspaceStore.js';
import OutlineTree from './OutlineTree.js';

function seedStore() {
  useWorkspaceStore.setState({
    stories: {
      'story-1': {
        id: 'story-1',
        mrId: 'mr-1',
        parentId: null,
        order: 0,
        depth: 0,
        title: 'Root Story',
        asA: 'As a user',
        iWant: 'I want features',
        soThat: 'I get value',
        invest: {
          independent: true,
          negotiable: true,
          valuable: true,
          estimable: true,
          small: true,
          testable: true
        },
        estimateDays: 1,
        childrenIds: [],
        testIds: [],
        status: 'Ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 0
      }
    },
    tree: [
      {
        storyId: 'story-1',
        status: 'Ready',
        tests: [],
        children: []
      }
    ],
    expanded: { 'story-1': true },
    mergeRequests: [],
    selectedMrId: 'mr-1',
    loading: false,
    tests: {}
  } as any);
}

describe('OutlineTree', () => {
  it('renders a story node', () => {
    seedStore();
    render(<OutlineTree />);
    expect(screen.getByText('Root Story')).toBeInTheDocument();
  });
});
