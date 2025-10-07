import { describe, expect, it } from 'vitest';
import { useStoryStore } from '../store/useStoryStore';

describe('useStoryStore', () => {
  it('toggles expansion', () => {
    const { toggleExpanded, expanded } = useStoryStore.getState();
    expect(expanded['story-1']).toBeUndefined();
    toggleExpanded('story-1', true);
    expect(useStoryStore.getState().expanded['story-1']).toBe(true);
  });
});
