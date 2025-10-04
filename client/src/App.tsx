import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { MindmapTree } from './components/MindmapTree';
import { UserStoryDetailPanel } from './components/UserStoryDetailPanel';
import { AcceptanceTestLog } from './components/AcceptanceTestLog';
import { CreateStoryModal, ParentReference } from './components/CreateStoryModal';
import { useMindmapSnapshot } from './hooks/useMindmapSnapshot';
import { MergeRequestRoot, UserStoryNode } from './types/mindmap';
import { MergeRequestSidebar } from './components/MergeRequestSidebar';
import { CreateAcceptanceTestModal } from './components/CreateAcceptanceTestModal';
import { CreateMergeRequestModal } from './components/CreateMergeRequestModal';

function App() {
  const { snapshot, isLoading, error } = useMindmapSnapshot();
  const [selectedMrId, setSelectedMrId] = useState<string | undefined>(() => snapshot.mergeRequests.at(0)?.id);
  const [selectedStoryId, setSelectedStoryId] = useState<string | undefined>(undefined);
  const [storyModalParent, setStoryModalParent] = useState<ParentReference | null>(null);
  const [acceptanceModalStory, setAcceptanceModalStory] = useState<UserStoryNode | null>(null);
  const [isMrModalOpen, setMrModalOpen] = useState(false);

  const activeMergeRequest = useMemo<MergeRequestRoot | undefined>(() => {
    if (!selectedMrId) {
      return snapshot.mergeRequests.at(0);
    }
    return snapshot.mergeRequests.find((mr) => mr.id === selectedMrId) ?? snapshot.mergeRequests.at(0);
  }, [selectedMrId, snapshot.mergeRequests]);

  useEffect(() => {
    if (activeMergeRequest && selectedStoryId) {
      const existing = findStoryById(activeMergeRequest.userStories, selectedStoryId);
      if (!existing) {
        setSelectedStoryId(activeMergeRequest.userStories.at(0)?.id);
      }
    } else if (activeMergeRequest && !selectedStoryId) {
      setSelectedStoryId(activeMergeRequest.userStories.at(0)?.id);
    }
  }, [activeMergeRequest, selectedStoryId]);

  useEffect(() => {
    if (!selectedMrId && snapshot.mergeRequests.length > 0) {
      setSelectedMrId(snapshot.mergeRequests[0].id);
    }
  }, [selectedMrId, snapshot.mergeRequests]);

  const activeStory = useMemo(() => {
    if (!activeMergeRequest) {
      return null;
    }
    if (!selectedStoryId) {
      return activeMergeRequest.userStories.at(0) ?? null;
    }
    return findStoryById(activeMergeRequest.userStories, selectedStoryId) ?? activeMergeRequest.userStories.at(0) ?? null;
  }, [activeMergeRequest, selectedStoryId]);

  const handleSelectStory = useCallback((story: UserStoryNode) => {
    setSelectedStoryId(story.id);
  }, []);

  const handleSelectMergeRequest = useCallback((mr: MergeRequestRoot) => {
    setSelectedMrId(mr.id);
    setSelectedStoryId(mr.userStories.at(0)?.id);
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__eyebrow">AI Project Manager</p>
          <h1>Mindmap dashboard</h1>
          <p className="app__description">
            Create merge requests, user stories, and acceptance tests with ChatGPT-style guidance before saving.
          </p>
        </div>
        <div className="app__cta">
          <button type="button" className="button" onClick={() => setMrModalOpen(true)}>
            Create MR
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => activeMergeRequest && setStoryModalParent({ type: 'mr', node: activeMergeRequest })}
            disabled={!activeMergeRequest}
          >
            Attach User Story
          </button>
        </div>
      </header>

      {error && <p className="app__error" role="alert">{error}</p>}

      <main className="app__layout" aria-busy={isLoading}>
        <MergeRequestSidebar
          mergeRequests={snapshot.mergeRequests}
          selectedId={activeMergeRequest?.id}
          onSelect={handleSelectMergeRequest}
          onCreateMr={() => setMrModalOpen(true)}
          onAttachUserStory={(mr) => setStoryModalParent({ type: 'mr', node: mr })}
        />

        <section className="panel app__mr-detail" aria-live="polite">
          {activeMergeRequest ? (
            <>
              <header className="panel-header">
                <div>
                  <h2 className="panel-title">{activeMergeRequest.title}</h2>
                  <p className="panel-subtitle">{activeMergeRequest.description}</p>
                </div>
                <dl className="definition-list">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span className={`badge badge--${activeMergeRequest.status.replace(/[^a-z]/g, '-')}`}>
                        {activeMergeRequest.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Stories</dt>
                    <dd>{activeMergeRequest.userStories.length}</dd>
                  </div>
                  <div>
                    <dt>Last updated</dt>
                    <dd>{new Date(activeMergeRequest.updatedAt).toLocaleString()}</dd>
                  </div>
                </dl>
              </header>
              <MindmapTree
                mergeRequest={activeMergeRequest}
                onSelectStory={handleSelectStory}
                selectedId={activeStory?.id}
              />
            </>
          ) : (
            <div className="panel-empty">Create a merge request to begin mapping work.</div>
          )}
        </section>

        <UserStoryDetailPanel
          story={activeStory ?? undefined}
          onAddChild={(story) => setStoryModalParent({ type: 'userStory', node: story })}
          onAttachAcceptanceTest={(story) => setAcceptanceModalStory(story)}
        />

        <AcceptanceTestLog log={snapshot.acceptanceTestLog} />
      </main>

      {storyModalParent && (
        <CreateStoryModal parent={storyModalParent} isOpen={!!storyModalParent} onClose={() => setStoryModalParent(null)} />
      )}

      {acceptanceModalStory && (
        <CreateAcceptanceTestModal
          story={acceptanceModalStory}
          isOpen={!!acceptanceModalStory}
          onClose={() => setAcceptanceModalStory(null)}
        />
      )}

      {isMrModalOpen && <CreateMergeRequestModal isOpen={isMrModalOpen} onClose={() => setMrModalOpen(false)} />}
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
