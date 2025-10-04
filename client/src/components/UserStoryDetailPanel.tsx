import { AcceptanceTestDraft, UserStoryNode } from '../types/mindmap';

interface UserStoryDetailPanelProps {
  story?: UserStoryNode;
  onAddChild: (story: UserStoryNode) => void;
  onAttachAcceptanceTest: (story: UserStoryNode) => void;
}

export function UserStoryDetailPanel({ story, onAddChild, onAttachAcceptanceTest }: UserStoryDetailPanelProps) {
  if (!story) {
    return (
      <section className="panel">
        <h2 className="panel-title">Story Detail</h2>
        <p className="panel-empty">Select a user story from the mindmap to inspect details.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2 className="panel-title">{story.title}</h2>
          <p className="panel-subtitle">
            As a {story.asA}, I want {story.iWant}, so that {story.soThat}.
          </p>
        </div>
        <div className="panel-actions">
          <button type="button" className="button" onClick={() => onAddChild(story)}>
            Add Child User Story
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => onAttachAcceptanceTest(story)}
          >
            Attach Acceptance Test
          </button>
        </div>
      </header>
      <dl className="definition-list">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`badge badge--${story.status.replace(/[^a-z]/g, '-')}`}>{story.status}</span>
          </dd>
        </div>
        <div>
          <dt>Acceptance Tests</dt>
          <dd>{story.acceptanceTests.length}</dd>
        </div>
      </dl>
      <AcceptanceTestList tests={story.acceptanceTests} />
    </section>
  );
}

interface AcceptanceTestListProps {
  tests: AcceptanceTestDraft[];
}

function AcceptanceTestList({ tests }: AcceptanceTestListProps) {
  if (!tests.length) {
    return <p className="panel-empty">No acceptance tests proposed yet.</p>;
  }

  return (
    <ul className="acceptance-test-list">
      {tests.map((test) => (
        <li key={test.id} className="acceptance-test-list__item">
          <header>
            <span className={`status-dot status-dot--${test.status}`}></span>
            <strong>{test.name}</strong>
          </header>
          <p>{test.description}</p>
          <ul className="gherkin-list">
            <li>
              <strong>Given:</strong> {test.given}
            </li>
            <li>
              <strong>When:</strong> {test.when}
            </li>
            <li>
              <strong>Then:</strong> {test.then}
            </li>
          </ul>
          {test.lastRunAt && (
            <footer>
              <small>
                Last run {new Date(test.lastRunAt).toLocaleString()} — {test.lastRunNotes ?? 'No notes recorded.'}
              </small>
            </footer>
          )}
        </li>
      ))}
    </ul>
  );
}
