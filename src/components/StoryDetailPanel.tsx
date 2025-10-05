import './StoryDetailPanel.css';
import type { AcceptanceTest, MergeRequest, UserStory } from '../state/types';

interface StoryDetailPanelProps {
  mergeRequest: MergeRequest | null;
  story: UserStory | null;
  acceptanceTests: AcceptanceTest[];
  onAttachStory: (parentStoryId: string | null) => void;
  onAttachAcceptance: (storyId: string) => void;
  childStoriesCollapsed: boolean;
  acceptanceCollapsed: boolean;
  onToggleChildStories: () => void;
  onToggleAcceptance: () => void;
}

export function StoryDetailPanel({
  mergeRequest,
  story,
  acceptanceTests,
  onAttachStory,
  onAttachAcceptance,
  childStoriesCollapsed,
  acceptanceCollapsed,
  onToggleChildStories,
  onToggleAcceptance
}: StoryDetailPanelProps) {
  if (!mergeRequest) {
    return (
      <aside className="story-panel story-panel--empty">
        <p>Select or create a merge request to begin planning.</p>
      </aside>
    );
  }

  return (
    <aside className="story-panel">
      <section className="story-panel__section">
        <header className="story-panel__header">
          <h2>{mergeRequest.title}</h2>
          <p>{mergeRequest.summary}</p>
        </header>
        <button type="button" className="btn btn--ghost" onClick={() => onAttachStory(null)}>
          Attach User Story
        </button>
      </section>

      {story ? (
        <section className="story-panel__section">
          <header className="story-panel__header">
            <h3>Selected Story</h3>
            <p className="story-panel__template">
              <strong>{story.asA}</strong>
              <br />
              <strong>{story.iWant}</strong>
              <br />
              <strong>{story.soThat}</strong>
            </p>
            {story.notes ? <p className="story-panel__notes">{story.notes}</p> : null}
            <div className="story-panel__actions">
              <button type="button" className="btn btn--primary" onClick={() => onAttachStory(story.id)}>
                Add Child User Story
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => onAttachAcceptance(story.id)}>
                Attach Acceptance Test
              </button>
            </div>
            <div className="story-panel__toggles">
              {story.childStoryIds.length > 0 ? (
                <button
                  type="button"
                  className="btn btn--toggle"
                  onClick={onToggleChildStories}
                  aria-pressed={!childStoriesCollapsed}
                >
                  {childStoriesCollapsed ? 'Expand Child User Stories' : 'Collapse Child User Stories'}
                </button>
              ) : null}
              {story.acceptanceTestIds.length > 0 ? (
                <button
                  type="button"
                  className="btn btn--toggle"
                  onClick={onToggleAcceptance}
                  aria-pressed={!acceptanceCollapsed}
                >
                  {acceptanceCollapsed ? 'Expand Acceptance Tests' : 'Collapse Acceptance Tests'}
                </button>
              ) : null}
            </div>
          </header>
          <section className="story-panel__tests">
            <h4>Acceptance Tests</h4>
            {acceptanceTests.length === 0 ? (
              <p className="story-panel__empty">No acceptance tests yet. Attach at least one to stay testable.</p>
            ) : acceptanceCollapsed ? (
              <p className="story-panel__empty">Acceptance tests are collapsed. Expand to review Given/When/Then coverage.</p>
            ) : (
              <ul>
                {acceptanceTests.map((test) => (
                  <li key={test.id}>
                    <article className="story-panel__test-card">
                      <header>
                        <span className={`story-panel__status story-panel__status--${test.status}`}>{test.status}</span>
                        <h5>{test.title || 'Acceptance Test'}</h5>
                      </header>
                      <dl>
                        <div>
                          <dt>Given</dt>
                          <dd>{test.given}</dd>
                        </div>
                        <div>
                          <dt>When</dt>
                          <dd>{test.when}</dd>
                        </div>
                        <div>
                          <dt>Then</dt>
                          <dd>{test.then}</dd>
                        </div>
                        {test.notes ? (
                          <div>
                            <dt>Notes</dt>
                            <dd>{test.notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      ) : (
        <section className="story-panel__section story-panel--empty">
          <p>Select a story node from the mindmap to view details and attach acceptance tests.</p>
        </section>
      )}
    </aside>
  );
}
