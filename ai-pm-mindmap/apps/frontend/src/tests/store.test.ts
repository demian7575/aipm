import { describe, it, expect, beforeEach } from 'vitest';
import { useStoryStore } from '../store/useStoryStore';

const initialState = structuredClone(useStoryStore.getState());

describe('useStoryStore', () => {
  beforeEach(() => {
    useStoryStore.setState(initialState, true);
  });

  it('selects merge request', () => {
    useStoryStore.setState({ mergeRequests: [{ id: 'mr1', title: '', description: '', repository: '', branch: '', status: 'open', drift: false, lastSyncAt: '', createdAt: '', updatedAt: '' }], selectedMrId: null });
    useStoryStore.getState().selectMergeRequest('mr1');
    expect(useStoryStore.getState().selectedMrId).toBe('mr1');
  });

  it('toggles expanded', () => {
    useStoryStore.setState({ expanded: { s1: false } });
    useStoryStore.getState().toggleExpanded('s1');
    expect(useStoryStore.getState().expanded.s1).toBe(true);
  });
});
