import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import OutlineTree from '../components/OutlineTree';
import { AcceptanceTest, UserStory } from '@ai-pm-mindmap/shared';

describe('OutlineTree', () => {
  const stories: UserStory[] = [
    {
      id: 'story-1',
      mrId: 'mr-1',
      parentId: null,
      title: 'As a user I want things fast',
      role: 'As a user',
      action: 'I want to do things fast',
      reason: 'So that I am happy',
      gwt: { given: 'Given context', when: 'When action', then: 'Then result in 5 seconds' },
      estimateDays: 1,
      status: 'draft',
      depth: 0,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  const tests: AcceptanceTest[] = [];

  it('renders tree role', () => {
    render(<OutlineTree stories={stories} tests={tests} />);
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });
});
