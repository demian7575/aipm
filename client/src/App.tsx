import { useCallback, useMemo, useState } from 'react';
import './App.css';
import { MindmapTree } from './components/MindmapTree';
import { UserStoryDetailPanel } from './components/UserStoryDetailPanel';
import { AcceptanceTestLog } from './components/AcceptanceTestLog';
import { CreateStoryModal } from './components/CreateStoryModal';
import { useMindmapSnapshot } from './hooks/useMindmapSnapshot';
import { UserStoryNode } from './types/mindmap';

function App() {
  const { snapshot, isLoading, error } = useMindmapSnapshot();
  const { root, acceptanceTestLog } = snapshot;
  const initialSelection = root.userStories.at(0);
  const [selectedStoryId, setSelectedStoryId] = useState<string | undefined>(initialSelection?.id);
  const [modalStory, setModalStory] = useState<UserStoryNode | null>(null);

  const activeStory = useMemo(() => {
    if (!selectedStoryId) {
      return initialSelection ?? null;
    }
    return findStoryById(root.userStories, selectedStoryId) ?? initialSelection ?? null;
  }, [initialSelection, root.userStories, selectedStoryId]);

  const handleSelectStory = useCallback((story: UserStoryNode) => {
    setSelectedStoryId(story.id);
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__eyebrow">Merge Request</p>
          <h1>{root.title}</h1>
          <p className="app__description">{root.description}</p>
          <dl className="app__meta">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`badge badge--${root.status.replace(/[^a-z]/g, '-')}`}>{root.status}</span>
              </dd>
            </div>
            <div>
              <dt>Stories</dt>
              <dd>{root.userStories.length}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{new Date(root.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
        <div className="app__cta">
          <button type="button" className="button">
            Sync from GitHub MR
          </button>
          <span className="app__cta-helper">Webhook ready — send a merge request event to populate new roots.</span>
        </div>
      </header>

      {error && <p className="app__error" role="alert">{error}</p>}

      <main className="app__layout" aria-busy={isLoading}>
        <MindmapTree
          userStories={root.userStories}
          onSelectStory={handleSelectStory}
          selectedId={activeStory?.id}
        />
        <UserStoryDetailPanel
          story={activeStory ?? undefined}
          onOpenModal={(story) => setModalStory(story)}
        />
        <AcceptanceTestLog log={acceptanceTestLog} />
      </main>

      {modalStory && (
        <CreateStoryModal parent={modalStory} isOpen={!!modalStory} onClose={() => setModalStory(null)} />
      )}
    </div>
  );
}

export default App;

function findStoryById(stories: UserStoryNode[], id: string): UserStoryNode | null {
  for (const story of stories) {
    if (story.id === id) {
      return story;
    }
    const child = findStoryById(story.children, id);
    if (child) {
      return child;
    }
  }
  return null;
}
