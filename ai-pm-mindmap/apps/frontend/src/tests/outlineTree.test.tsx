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
  const setExpandedSpy = vi.fn();

  beforeEach(() => {
    setExpandedSpy.mockReset();
    const baseSetExpanded = useStoryStore.getState().setExpanded;
    useStoryStore.setState((state) => ({
      ...state,
      mergeRequests: [{
        id: 'mr',
        title: 'Mock MR',
        description: '',
        repository: '',
        branch: '',
        status: 'open',
        drift: false,
        lastSyncAt: '',
        createdAt: '',
        updatedAt: ''
      }] as any,
      selectedMrId: 'mr',
      tree: mockTree as any,
      expanded: { 'mr:mr': true, s1: true, s2: true } as Record<string, boolean>,
      selectStory: vi.fn() as any,
      toggleExpanded: vi.fn() as any,
      setExpanded: (map: Record<string, boolean>) => {
        setExpandedSpy(map);
        baseSetExpanded(map);
      }
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

  it('expands and collapses all nodes', () => {
    render(<OutlineTree />);
    const expandButton = screen.getByRole('button', { name: /expand all/i });
    const collapseButton = screen.getByRole('button', { name: /collapse all/i });

    fireEvent.click(collapseButton);
    expect(setExpandedSpy).toHaveBeenCalledWith(
      expect.objectContaining({ 'mr:mr': false, s1: false, s2: false })
    );

    fireEvent.click(expandButton);
    expect(setExpandedSpy).toHaveBeenCalledWith(
      expect.objectContaining({ 'mr:mr': true, s1: true, s2: true })
    );
  });
});
