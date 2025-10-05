import { useMemo, useReducer, useState } from 'react';
import './styles/app.css';
import { MergeRequestPanel } from './components/MergeRequestPanel';
import { StoryDetailPanel } from './components/StoryDetailPanel';
import { CreateMergeRequestModal } from './components/CreateMergeRequestModal';
import { CreateStoryModal } from './components/CreateStoryModal';
import { CreateAcceptanceTestModal } from './components/CreateAcceptanceTestModal';
import { MindmapCanvas } from './components/MindmapCanvas';
import { appReducer } from './state/reducer';
import { initialState } from './state/initialState';
import { buildMindmap } from './mindmap/buildMindmap';
import type { AppAction } from './state/reducer';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [showMrModal, setShowMrModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState<null | { parent: string | null }>(null);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState<string | null>(null);

  const mergeRequests = useMemo(
    () => Object.values(state.mergeRequests),
    [state.mergeRequests]
  );
  const selectedMergeRequest = state.selectedMergeRequestId ? state.mergeRequests[state.selectedMergeRequestId] : null;
  const selectedStory = state.selectedStoryId ? state.userStories[state.selectedStoryId] : null;
  const acceptanceTests = selectedStory
    ? selectedStory.acceptanceTestIds.map((id) => state.acceptanceTests[id]).filter(Boolean)
    : [];
  const childStoriesCollapsed = selectedStory ? !!state.collapsedStoryChildren[selectedStory.id] : false;
  const acceptanceCollapsed = selectedStory ? !!state.collapsedAcceptanceTests[selectedStory.id] : false;

  const { nodes, edges } = useMemo(
    () => buildMindmap(state, selectedMergeRequest),
    [state, selectedMergeRequest]
  );

  function handleDispatch(action: AppAction) {
    dispatch(action);
  }

  const toggleStoryChildren = (storyId: string) => {
    handleDispatch({ type: 'toggleStoryChildren', storyId });
  };

  const toggleAcceptanceTests = (storyId: string) => {
    handleDispatch({ type: 'toggleAcceptanceTests', storyId });
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <h1>AI Project Manager Workspace</h1>
          <p>Break merge requests into INVEST-ready stories and acceptance tests.</p>
        </div>
        <span className="app-shell__version">v0.1.0</span>
      </header>
      <main className="app-shell__main">
        <MergeRequestPanel
          mergeRequests={mergeRequests}
          selectedId={state.selectedMergeRequestId}
          onSelect={(mergeRequestId) => handleDispatch({ type: 'selectMergeRequest', mergeRequestId })}
          onCreate={() => setShowMrModal(true)}
        />
        <MindmapCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={
            selectedStory
              ? `story-${selectedStory.id}`
              : selectedMergeRequest
              ? `mr-${selectedMergeRequest.id}`
              : null
          }
          onNodeSelect={(id) => {
            if (id.startsWith('story-')) {
              handleDispatch({ type: 'selectStory', storyId: id.replace('story-', '') });
            } else if (id.startsWith('mr-')) {
              const mergeRequestId = id.replace('mr-', '');
              handleDispatch({ type: 'selectMergeRequest', mergeRequestId });
            } else if (id.startsWith('acceptance-')) {
              const storyEntry = Object.values(state.userStories).find((story) => story.acceptanceTestIds.includes(id.replace('acceptance-', '')));
              if (storyEntry) {
                handleDispatch({ type: 'selectStory', storyId: storyEntry.id });
              }
            }
          }}
          onToggleStoryChildren={toggleStoryChildren}
          onToggleAcceptanceTests={toggleAcceptanceTests}
        />
        <StoryDetailPanel
          mergeRequest={selectedMergeRequest}
          story={selectedStory}
          acceptanceTests={acceptanceTests}
          onAttachStory={(parentStoryId) => setShowStoryModal({ parent: parentStoryId })}
          onAttachAcceptance={(storyId) => setShowAcceptanceModal(storyId)}
          childStoriesCollapsed={childStoriesCollapsed}
          acceptanceCollapsed={acceptanceCollapsed}
          onToggleChildStories={() => {
            if (!selectedStory) return;
            toggleStoryChildren(selectedStory.id);
          }}
          onToggleAcceptance={() => {
            if (!selectedStory) return;
            toggleAcceptanceTests(selectedStory.id);
          }}
        />
      </main>

      <CreateMergeRequestModal
        open={showMrModal}
        onClose={() => setShowMrModal(false)}
        onCreate={({ title, summary }) => handleDispatch({ type: 'createMergeRequest', title, summary })}
      />

      <CreateStoryModal
        open={showStoryModal !== null}
        parentPersona={showStoryModal?.parent ? state.userStories[showStoryModal.parent]?.asA : undefined}
        onClose={() => setShowStoryModal(null)}
        onCreate={({ asA, iWant, soThat, notes }) => {
          if (!selectedMergeRequest) return;
          handleDispatch({
            type: 'createStory',
            mergeRequestId: selectedMergeRequest.id,
            parentStoryId: showStoryModal?.parent ?? null,
            asA,
            iWant,
            soThat,
            notes
          });
        }}
      />

      <CreateAcceptanceTestModal
        open={showAcceptanceModal !== null}
        onClose={() => setShowAcceptanceModal(null)}
        onCreate={({ title, given, when, then, notes }) => {
          const storyId = showAcceptanceModal;
          if (!storyId) return;
          handleDispatch({
            type: 'createAcceptanceTest',
            storyId,
            title,
            given,
            when,
            then,
            notes
          });
        }}
      />
    </div>
  );
}
