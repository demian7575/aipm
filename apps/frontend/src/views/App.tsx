import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceStore } from '../state/useWorkspaceStore.js';
import OutlineTree from '../components/apps/OutlineTree.js';
import MindmapView from '../components/apps/MindmapView.js';
import DetailPanel from '../components/apps/DetailPanel.js';
import GithubPanel from '../components/apps/GithubPanel.js';

export default function App() {
  const fetchInitial = useWorkspaceStore((state) => state.fetchInitial);
  const loading = useWorkspaceStore((state) => state.loading);
  const error = useWorkspaceStore((state) => state.error);
  const { t } = useTranslation();
  const expandAll = useWorkspaceStore((state) => state.expandAll);
  const collapseAll = useWorkspaceStore((state) => state.collapseAll);
  const expandToDepth = useWorkspaceStore((state) => state.expandToDepth);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const expand = params.get('expand');
    if (expand === 'all') {
      expandAll();
    } else if (expand === 'none') {
      collapseAll();
    } else if (expand?.startsWith('depth:')) {
      const depth = Number(expand.split(':')[1]);
      if (!Number.isNaN(depth)) {
        expandToDepth(depth);
      }
    }
  }, [expandAll, collapseAll, expandToDepth]);

  return (
    <div className="min-h-screen grid grid-cols-[320px_1fr_320px] grid-rows-[auto_1fr] gap-4 p-4 bg-slate-950 text-slate-200">
      <header className="col-span-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Project Manager Mindmap</h1>
          <p className="text-sm text-slate-400">INVEST and GWT validation at authoring time</p>
        </div>
        <GithubPanel />
      </header>
      <aside className="bg-slate-900 rounded-lg p-3 overflow-hidden" aria-label={t('outline')}>
        {loading && <p>Loading workspace...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && <OutlineTree />}
      </aside>
      <main className="bg-slate-900 rounded-lg overflow-hidden">
        <MindmapView />
      </main>
      <section className="bg-slate-900 rounded-lg overflow-y-auto p-4">
        <DetailPanel />
      </section>
    </div>
  );
}
