import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OutlineTree } from '../components/OutlineTree';
import { useStoryStore } from '../store/useStoryStore';

const mockTree = [
  {
    id: 's1',
    title: 'Root story',
    parentId: null,
    depth: 0,
    order: 0,
    mrId: 'mr',
    role: 'As a user',
    action: 'I want to see',
    reason: 'So that I know',
    gwt: { given: 'Given', when: 'When', then: 'Then response in 2 seconds' },
    estimateDays: 1,
    status: 'draft',
    createdAt: '',
    updatedAt: '',
    children: [
      {
        id: 's2',
        title: 'Child story',
        parentId: 's1',
        depth: 1,
        order: 0,
        mrId: 'mr',
        role: 'As a user',
        action: 'I want to test',
        reason: 'So that I know',
        gwt: { given: 'Given', when: 'When', then: 'Then response in 2 seconds' },
        estimateDays: 1,
        status: 'draft',
        createdAt: '',
        updatedAt: '',
        children: []
      }
    ]
  }
];

describe('OutlineTree', () => {
  beforeEach(() => {
    useStoryStore.setState((state) => ({
      ...state,
      tree: mockTree as any,
      expanded: { s1: true } as Record<string, boolean>,
      selectStory: vi.fn() as any,
      toggleExpanded: vi.fn() as any
    }));
  });

  it('renders nodes', () => {
    render(<OutlineTree />);
    expect(screen.getByText('Root story')).toBeInTheDocument();
    expect(screen.getByText('Child story')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(<OutlineTree />);
    const tree = screen.getByRole('tree');
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    expect(useStoryStore.getState().toggleExpanded).toHaveBeenCalled();
  });
});
