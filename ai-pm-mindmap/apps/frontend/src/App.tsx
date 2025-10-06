import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LocaleProvider, useLocale } from './i18n/context';
import { api, StoryNode } from './utils/api';
import OutlineTreeView from './views/OutlineTreeView';
import MindmapView from './views/MindmapView';
import DetailPanel from './components/DetailPanel';
import GitHubPanel from './components/GitHubPanel';
import Toast from './components/Toast';
import { findStoryNode } from './utils/tree';
import { UserStory } from '@ai-pm-mindmap/shared';

const DEPTH_LIMIT = Number(import.meta.env.VITE_STORY_DEPTH_LIMIT ?? 4);

const AppShell = () => {
  const queryClient = useQueryClient();
  const { locale, setLocale, t } = useLocale();
  const [viewMode, setViewMode] = useState<'outline' | 'mindmap'>('outline');
  const [selectedMrId, setSelectedMrId] = useState<string>();
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mergeRequestsQuery = useQuery(['mergeRequests'], api.listMergeRequests, {
    onSuccess: (data) => {
      if (!selectedMrId && data.length > 0) {
        setSelectedMrId(data[0].id);
      }
    },
  });

  const storiesQuery = useQuery(['stories', selectedMrId], () => api.listStories(selectedMrId!), {
    enabled: Boolean(selectedMrId),
    onSuccess: (data) => {
      if (data.length === 0) {
        setSelectedStoryId(null);
        return;
      }
      if (selectedStoryId) {
        const exists = findStoryNode(data, selectedStoryId);
        if (!exists) {
          setSelectedStoryId(data[0].id);
        }
      } else {
        setSelectedStoryId(data[0].id);
      }
    },
  });

  const stories = storiesQuery.data ?? [];
  const mergeRequests = mergeRequestsQuery.data ?? [];
  const selectedMergeRequest = useMemo(
    () => mergeRequests.find((mr) => mr.id === selectedMrId) ?? null,
    [mergeRequests, selectedMrId],
  );

  const selectedStory: StoryNode | null = useMemo(() => {
    if (!selectedStoryId) return null;
    return findStoryNode(stories, selectedStoryId) ?? null;
  }, [stories, selectedStoryId]);

  const invalidateStories = async () => {
    await queryClient.invalidateQueries(['stories', selectedMrId]);
  };

  const notifyError = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    setToast(message);
  };

  const createStoryMutation = useMutation(api.createStory, {
    onSuccess: async (data) => {
      await invalidateStories();
      setToast('Story created');
      if (data?.story?.id) {
        setSelectedStoryId(data.story.id);
      }
    },
    onError: (error) => notifyError(error, 'Failed to create story'),
  });

  const updateStoryMutation = useMutation(
    ({ id, payload }: { id: string; payload: Partial<UserStory> }) => api.updateStory(id, payload),
    {
      onSuccess: async (data) => {
        await invalidateStories();
        setToast('Story updated');
        if (data?.story?.id) {
          setSelectedStoryId(data.story.id);
        }
      },
      onError: (error) => notifyError(error, 'Failed to update story'),
    },
  );

  const deleteStoryMutation = useMutation(api.deleteStory, {
    onSuccess: async () => {
      await invalidateStories();
      setToast('Story deleted');
    },
    onError: (error) => notifyError(error, 'Failed to delete story'),
  });

  const moveStoryMutation = useMutation(
    ({ id, parentId, index }: { id: string; parentId: string | null; index: number }) =>
      api.moveStory(id, { parentId, index }),
    {
      onSuccess: async () => {
        await invalidateStories();
        setToast('Story moved');
      },
      onError: (error) => notifyError(error, 'Failed to move story'),
    },
  );

  const updateStatusMutation = useMutation(
    ({ id, status }: { id: string; status: UserStory['status'] }) =>
      api.updateStoryStatus(id, status),
    {
      onSuccess: async () => {
        await invalidateStories();
        setToast('Status updated');
      },
      onError: (error) => notifyError(error, 'Failed to update status'),
    },
  );

  const createTestMutation = useMutation(api.createTest, {
    onSuccess: async () => {
      await invalidateStories();
      setToast('Test created');
    },
    onError: (error) => notifyError(error, 'Failed to create test'),
  });

  const toggleDriftMutation = useMutation(api.toggleDrift, {
    onSuccess: async () => {
      await queryClient.invalidateQueries(['mergeRequests']);
      await invalidateStories();
      setToast('Branch refreshed');
    },
    onError: (error) => notifyError(error, 'Failed to refresh branch'),
    onSettled: () => setIsRefreshing(false),
  });

  const handleAddStory = async (parentId: string | null) => {
    if (!selectedMrId) return;
    const title = window.prompt('Story title (As a/I want/So that required)');
    if (!title) return;
    const asA = window.prompt('As a...');
    if (!asA) return;
    const iWant = window.prompt('I want...');
    if (!iWant) return;
    const soThat = window.prompt('So that...');
    if (!soThat) return;
    const estimate = window.prompt('Estimate (days, optional)');
    await createStoryMutation.mutateAsync({
      mrId: selectedMrId,
      parentId,
      title,
      asA,
      iWant,
      soThat,
      status: 'backlog',
      estimateDays: estimate ? Number(estimate) : null,
    } as any);
  };

  const handleAddSibling = (storyId: string) => {
    const node = findStoryNode(stories, storyId);
    if (!node) return;
    handleAddStory(node.parentId ?? null);
  };

  const handleAddTest = async (storyId: string) => {
    const title = window.prompt('Test title');
    if (!title) return;
    const given = window.prompt('Given...');
    if (!given) return;
    const when = window.prompt('When...');
    if (!when) return;
    const then = window.prompt('Then...');
    if (!then) return;
    await createTestMutation.mutateAsync({
      storyId,
      title,
      given,
      when,
      then,
      status: 'pending',
    } as any);
  };

  const handleDelete = async (storyId: string) => {
    if (!window.confirm('Delete this story and its descendants?')) return;
    await deleteStoryMutation.mutateAsync(storyId);
  };

  const handleMove = async (storyId: string, parentId: string | null, index: number) => {
    try {
      await moveStoryMutation.mutateAsync({ id: storyId, parentId, index });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move story';
      setToast(message);
    }
  };

  const handleUpdateStatus = async (storyId: string, status: UserStory['status']) => {
    await updateStatusMutation.mutateAsync({ id: storyId, status });
  };

  const handleSaveStory = async (values: Partial<StoryNode>) => {
    if (!values.id) return;
    const payload: Partial<UserStory> = {
      title: values.title,
      asA: values.asA,
      iWant: values.iWant,
      soThat: values.soThat,
      estimateDays: values.estimateDays as any,
    };
    await updateStoryMutation.mutateAsync({ id: values.id, payload });
  };

  const handleRefreshBranch = () => {
    if (!selectedMergeRequest) return;
    setIsRefreshing(true);
    toggleDriftMutation.mutate(selectedMergeRequest.id);
  };

  const loading = mergeRequestsQuery.isLoading || storiesQuery.isLoading;
  const error = mergeRequestsQuery.error || storiesQuery.error;

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-slate-950 p-4 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{t('appTitle')}</h1>
          <select
            className="rounded bg-slate-800 px-2 py-1 text-sm"
            value={selectedMrId ?? ''}
            onChange={(event) => setSelectedMrId(event.target.value)}
          >
            {mergeRequests.map((mr) => (
              <option key={mr.id} value={mr.id}>
                {mr.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={
              viewMode === 'outline'
                ? 'rounded bg-brand px-2 py-1 text-sm'
                : 'rounded bg-slate-800 px-2 py-1 text-sm'
            }
            onClick={() => setViewMode('outline')}
          >
            {t('outlineView')}
          </button>
          <button
            type="button"
            className={
              viewMode === 'mindmap'
                ? 'rounded bg-brand px-2 py-1 text-sm'
                : 'rounded bg-slate-800 px-2 py-1 text-sm'
            }
            onClick={() => setViewMode('mindmap')}
          >
            {t('mindmapView')}
          </button>
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-1 text-sm"
            onClick={() => handleAddStory(null)}
          >
            {t('addStory')}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs">Locale</label>
          <select
            className="rounded bg-slate-800 px-2 py-1 text-sm"
            value={locale}
            onChange={(event) => setLocale(event.target.value as typeof locale)}
          >
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </div>
      </header>

      {loading && <p className="text-sm text-slate-400">Loading workspace…</p>}
      {error && <p className="text-sm text-red-400">Failed to load data.</p>}

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-4">
          {viewMode === 'outline' ? (
            <OutlineTreeView
              mrId={selectedMrId}
              tree={stories}
              selectedId={selectedStoryId}
              onSelect={setSelectedStoryId}
              onEdit={(id) => setSelectedStoryId(id)}
              onAddChild={handleAddStory}
              onAddSibling={handleAddSibling}
              onAddTest={handleAddTest}
              onDelete={handleDelete}
              onMove={handleMove}
              onStatusChange={handleUpdateStatus}
              storyDepthLimit={DEPTH_LIMIT}
              showToast={(message) => setToast(message)}
            />
          ) : (
            <MindmapView treeData={stories} selectedId={selectedStoryId} onSelect={setSelectedStoryId} />
          )}
          <GitHubPanel
            mergeRequest={selectedMergeRequest}
            onRefresh={handleRefreshBranch}
            isRefreshing={isRefreshing || toggleDriftMutation.isLoading}
          />
        </section>
        <DetailPanel
          story={selectedStory}
          onSave={handleSaveStory}
          onAddTest={handleAddTest}
        />
      </main>

      {toast && (
        <div className="pointer-events-none fixed bottom-4 right-4 flex flex-col gap-2">
          <Toast message={toast} onDismiss={() => setToast(null)} />
        </div>
      )}
    </div>
  );
};

const App = () => (
  <LocaleProvider>
    <AppShell />
  </LocaleProvider>
);

export default App;
