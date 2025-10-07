import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  fetchMergeRequests,
  fetchStories,
  fetchTests,
  reseed,
  updateBranch,
  createMergeRequest,
  createStory
} from './lib/api';
import { useStoryStore } from './store/useStoryStore';
import OutlineTree from './components/OutlineTree';
import MindmapView from './components/MindmapView';
import DetailPanel from './components/DetailPanel';
import GitHubPanel from './components/GitHubPanel';
import { AcceptanceTest, MergeRequest, UserStory } from '@ai-pm-mindmap/shared';

function useQueryParamExpansion(stories: UserStory[]) {
  const location = useLocation();
  const { setExpanded } = useStoryStore();

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const expand = search.get('expand');
    if (!expand) return;
    if (expand === 'all') {
      const map: Record<string, boolean> = {};
      stories.forEach((story) => {
        map[story.id] = true;
      });
      setExpanded(map);
    } else if (expand === 'none') {
      setExpanded({});
    } else if (expand.startsWith('ids:')) {
      const ids = expand.split(':')[1]?.split(',') ?? [];
      const map: Record<string, boolean> = {};
      ids.forEach((id) => (map[id] = true));
      setExpanded(map);
    }
  }, [location.search, setExpanded, stories]);
}

export default function App() {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const { view, setView, selectMr, selectedMrId, setLocale, locale } = useStoryStore();
  const { data: mergeRequests = [] } = useQuery({ queryKey: ['mergeRequests'], queryFn: fetchMergeRequests });
  const { data: stories = [] } = useQuery({ queryKey: ['stories'], queryFn: fetchStories });
  const { data: tests = [] } = useQuery({ queryKey: ['tests'], queryFn: fetchTests });

  useEffect(() => {
    if (!selectedMrId && mergeRequests.length > 0) {
      selectMr(mergeRequests[0].id);
    }
  }, [mergeRequests, selectMr, selectedMrId]);

  useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale, i18n]);

  useQueryParamExpansion(stories);

  const currentMr = useMemo(
    () => mergeRequests.find((mr) => mr.id === selectedMrId) ?? null,
    [mergeRequests, selectedMrId]
  );

  const mrStories = useMemo(() => stories.filter((story) => story.mrId === selectedMrId), [stories, selectedMrId]);
  const mrTests = useMemo(() => tests.filter((test) => mrStories.some((story) => story.id === test.storyId)), [
    tests,
    mrStories
  ]);

  const handleRefreshBranch = async (mr: MergeRequest) => {
    await updateBranch(mr.id);
    await queryClient.invalidateQueries({ queryKey: ['mergeRequests'] });
  };

  const handleReseed = async () => {
    await reseed();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['mergeRequests'] }),
      queryClient.invalidateQueries({ queryKey: ['stories'] }),
      queryClient.invalidateQueries({ queryKey: ['tests'] })
    ]);
  };

  const navigate = useNavigate();

  const setExpandQuery = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('expand', value);
    navigate(`${url.pathname}?${url.searchParams.toString()}`, { replace: true });
  };

  const handleAddMergeRequest = async () => {
    const title = window.prompt('Merge request title');
    if (!title) return;
    const repository = window.prompt('Repository (owner/name)', 'ai/mindmap') ?? 'ai/mindmap';
    const branch = window.prompt('Branch name', 'feature/new') ?? 'feature/new';
    const now = new Date().toISOString();
    try {
      const id = `mr-${Date.now()}`;
      await createMergeRequest({
        id,
        title,
        description: '',
        repository,
        branch,
        status: 'open',
        drift: false,
        lastSyncAt: now,
        createdAt: now,
        updatedAt: now
      });
      await queryClient.invalidateQueries({ queryKey: ['mergeRequests'] });
      selectMr(id);
    } catch (error: any) {
      alert(error?.response?.data?.message ?? 'Unable to create merge request');
    }
  };

  const handleAddRootStory = async () => {
    if (!selectedMrId) return;
    const title = window.prompt('Story title (As a/I want/So that)');
    if (!title) return;
    const role = window.prompt('Role');
    const action = window.prompt('Action');
    const reason = window.prompt('Reason');
    const given = window.prompt('Given');
    const when = window.prompt('When');
    const then = window.prompt('Then (with measurable metric)');
    const estimate = Number(window.prompt('Estimate days', '1') ?? '1');
    if (!role || !action || !reason || !given || !when || !then) {
      alert('All story fields are required.');
      return;
    }
    try {
      await createStory({
        id: `story-${Date.now()}`,
        mrId: selectedMrId,
        parentId: null,
        title,
        role,
        action,
        reason,
        gwt: { given, when, then },
        estimateDays: estimate,
        status: 'draft'
      });
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
    } catch (error: any) {
      alert(error?.response?.data?.message ?? 'Unable to create story');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4 gap-4">
          <div>
            <h1 className="text-xl font-semibold text-sky-300">{t('appTitle')}</h1>
            <p className="text-sm text-slate-400">AI-assisted planning with INVEST and ambiguity checks</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <span>{t('outline')}</span>
              <input
                type="radio"
                name="view"
                value="outline"
                checked={view === 'outline'}
                onChange={() => setView('outline')}
                aria-label="Outline view"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <span>{t('mindmap')}</span>
              <input
                type="radio"
                name="view"
                value="mindmap"
                checked={view === 'mindmap'}
                onChange={() => setView('mindmap')}
                aria-label="Mindmap view"
              />
            </label>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as 'en' | 'ko')}
              className="bg-slate-800 text-slate-100 rounded px-2 py-1"
              aria-label="Switch language"
            >
              <option value="en">English</option>
              <option value="ko">한국어</option>
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 p-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-300" htmlFor="mr-select">
              {t('selectMergeRequest')}
            </label>
            <select
                id="mr-select"
                className="bg-slate-800 text-slate-100 rounded px-2 py-1"
                value={selectedMrId ?? ''}
                onChange={(event) => selectMr(event.target.value)}
              >
                {mergeRequests.map((mr) => (
                  <option key={mr.id} value={mr.id}>
                    {mr.title}
                  </option>
                ))}
              </select>
              <button
                className="text-xs bg-emerald-500 text-slate-900 rounded px-2 py-1"
                onClick={handleAddMergeRequest}
              >
                + MR
              </button>
          </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <button className="underline" onClick={() => setExpandQuery('all')}>
                {t('expandAll')}
              </button>
              <button className="underline" onClick={() => setExpandQuery('none')}>
                {t('collapseAll')}
              </button>
              <button className="underline" onClick={handleAddRootStory}>
                {t('addStory')}
              </button>
              <button className="underline" onClick={handleReseed}>
                Reset
              </button>
            </div>
          </div>

          {view === 'outline' ? (
            <OutlineTree stories={mrStories} tests={mrTests} />
          ) : (
            <MindmapView stories={mrStories} tests={mrTests} />
          )}
        </section>
        <aside className="space-y-4">
          <DetailPanel stories={mrStories} tests={mrTests} />
          {currentMr ? (
            <GitHubPanel mergeRequest={currentMr} onRefresh={handleRefreshBranch} />
          ) : null}
        </aside>
      </main>
    </div>
  );
}
