import './MergeRequestPanel.css';
import type { MergeRequest } from '../state/types';

interface MergeRequestPanelProps {
  mergeRequests: MergeRequest[];
  selectedId: string | null;
  onSelect: (mergeRequestId: string) => void;
  onCreate: () => void;
}

export function MergeRequestPanel({ mergeRequests, selectedId, onSelect, onCreate }: MergeRequestPanelProps) {
  return (
    <aside className="mr-panel">
      <header className="mr-panel__header">
        <div>
          <h2>Merge Requests</h2>
          <p>Track initiatives and break them down with the AI assistant.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={onCreate}>
          Create MR
        </button>
      </header>
      <ul className="mr-panel__list">
        {mergeRequests.map((mr) => (
          <li key={mr.id}>
            <button
              type="button"
              className={`mr-panel__item ${selectedId === mr.id ? 'mr-panel__item--selected' : ''}`}
              onClick={() => onSelect(mr.id)}
            >
              <span className="mr-panel__title">{mr.title}</span>
              <span className={`mr-panel__status mr-panel__status--${mr.status}`}>{mr.status}</span>
              <p className="mr-panel__summary">{mr.summary}</p>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
