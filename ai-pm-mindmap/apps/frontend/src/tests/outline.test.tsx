import { render, fireEvent } from '@testing-library/react';
import OutlineTreeView from '../views/OutlineTreeView';
import { LocaleProvider } from '../i18n/context';
import { StoryNode } from '../utils/api';

describe('OutlineTreeView', () => {
  const sampleTree: StoryNode[] = [
    {
      id: 'root',
      mrId: 'mr1',
      parentId: null,
      title: 'Root story',
      asA: 'As a user',
      iWant: 'I want features',
      soThat: 'So that I deliver value',
      status: 'backlog',
      estimateDays: 1,
      order: 0,
      depth: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      children: [],
      tests: [],
      analysis: {
        invest: {
          independent: { satisfied: true, message: '' },
          negotiable: { satisfied: true, message: '' },
          valuable: { satisfied: true, message: '' },
          estimable: { satisfied: true, message: '' },
          small: { satisfied: true, message: '' },
          testable: { satisfied: false, message: '' },
          summary: { score: 5, total: 6 },
        },
        ambiguity: { hasIssues: false, fields: {} },
      },
    },
  ];

  it('handles keyboard selection', () => {
    const handleEdit = vi.fn();
    const { getByRole } = render(
      <LocaleProvider>
        <OutlineTreeView
          mrId="mr1"
          tree={sampleTree}
          selectedId="root"
          onSelect={vi.fn()}
          onEdit={handleEdit}
          onAddChild={vi.fn()}
          onAddSibling={vi.fn()}
          onAddTest={vi.fn()}
          onDelete={vi.fn()}
          onMove={vi.fn()}
          onStatusChange={vi.fn()}
          storyDepthLimit={4}
          showToast={vi.fn()}
        />
      </LocaleProvider>,
    );

    const tree = getByRole('tree');
    fireEvent.keyDown(tree, { key: 'Enter' });
    expect(handleEdit).toHaveBeenCalledWith('root');
  });
});
