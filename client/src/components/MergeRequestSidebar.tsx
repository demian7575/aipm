import { MergeRequestRoot } from '../types/mindmap';

interface MergeRequestSidebarProps {
  mergeRequests: MergeRequestRoot[];
  selectedId?: string;
  onSelect: (mr: MergeRequestRoot) => void;
  onCreateMr: () => void;
  onAttachUserStory: (mr: MergeRequestRoot) => void;
}

export function MergeRequestSidebar({
  mergeRequests,
  selectedId,
  onSelect,
  onCreateMr,
  onAttachUserStory,
}: MergeRequestSidebarProps) {
  return (
    <aside className="mr-sidebar" aria-label="Merge request list">
      <header className="mr-sidebar__header">
        <h2 className="panel-title">Merge Requests</h2>
        <button type="button" className="button" onClick={onCreateMr}>
          Create MR
        </button>
      </header>
      {mergeRequests.length === 0 ? (
        <p className="panel-empty">No merge requests yet. Start by creating one.</p>
      ) : (
        <ul className="mr-sidebar__list">
          {mergeRequests.map((mr) => {
            const isSelected = mr.id === selectedId;
            return (
              <li key={mr.id} className={`mr-sidebar__item ${isSelected ? 'is-selected' : ''}`}>
                <button type="button" onClick={() => onSelect(mr)} className="mr-sidebar__select">
                  <span className={`status-dot status-dot--${mr.status.replace(/[^a-z]/g, '-')}`}></span>
                  <span className="mr-sidebar__title">{mr.title}</span>
                </button>
                <dl className="mr-sidebar__meta">
                  <div>
                    <dt>Stories</dt>
                    <dd>{mr.userStories.length}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{new Date(mr.updatedAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="button button--secondary mr-sidebar__attach"
                  onClick={() => onAttachUserStory(mr)}
                >
                  Attach User Story
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
