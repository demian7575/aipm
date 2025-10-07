import { useEffect, useMemo, useState } from 'react';
import { OutlineTree } from './components/OutlineTree';
import { MindmapView } from './components/MindmapView';
import { DetailPanel } from './components/DetailPanel';
import { GitHubPanel } from './components/GitHubPanel';
import {
  useStoryStore,
  selectCurrentMergeRequest,
  selectCurrentStory,
  selectTestsForStory,
  selectTree
} from './store/useStoryStore';
import { t, setLocale } from './i18n';

const EXPANSION_KEY = 'ai-pm-mindmap-expanded';

export default function App() {
  const [locale, setLocaleState] = useState<'en' | 'ko'>('en');
  const store = useStoryStore();
  const tree = useStoryStore(selectTree);
  const currentMr = selectCurrentMergeRequest(store);
  const currentStory = selectCurrentStory(store);
  const tests = currentStory ? selectTestsForStory(store, currentStory.id) : [];
  const childCount = useMemo(
    () => (currentStory ? tree.find((node) => node.id === currentStory.id)?.children.length ?? 0 : 0),
    [tree, currentStory]
  );

  useEffect(() => {
    setLocale(locale);
  }, [locale]);

  useEffect(() => {
    store.initialize();
    const stored = safeRead();
    if (stored) {
      store.setExpanded(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tree.length === 0) return;
    const query = new URLSearchParams(window.location.search);
    const expand = query.get('expand');
    if (!expand) return;
    const map: Record<string, boolean> = {};
    if (expand === 'all') {
      tree.forEach((node) => expandRecursive(node, map, true));
    } else if (expand === 'none') {
      tree.forEach((node) => expandRecursive(node, map, false));
    } else if (expand.startsWith('ids:')) {
      const ids = expand.replace('ids:', '').split(',');
      tree.forEach((node) => expandRecursive(node, map, ids.includes(node.id)));
    }
    store.setExpanded(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.length]);

  useEffect(() => {
    persistExpansion(store.expanded);
  }, [store.expanded]);

  if (store.loading) {
    return <div className="app-shell">Loading…</div>;
  }

  return (
    <div className="app-shell">
      <header>
        <div>
          <h1 style={{ margin: 0 }}>AI PM Mindmap</h1>
          <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Plan merge requests, stories, and tests</div>
        </div>
        <div className="toolbar">
          <div className="switch" role="tablist">
            <button
              className={store.view === 'outline' ? 'active' : ''}
              role="tab"
              aria-selected={store.view === 'outline'}
              onClick={() => store.toggleView('outline')}
            >
              {t('outlineView')}
            </button>
            <button
              className={store.view === 'mindmap' ? 'active' : ''}
              role="tab"
              aria-selected={store.view === 'mindmap'}
              onClick={() => store.toggleView('mindmap')}
            >
              {t('mindmapView')}
            </button>
          </div>
          <select value={locale} onChange={(event) => setLocaleState(event.target.value as 'en' | 'ko')}>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </div>
      </header>
      <main>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Merge Requests</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {store.mergeRequests.map((mr) => (
              <li key={mr.id}>
                <button
                  onClick={() => store.selectMergeRequest(mr.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 8,
                    border: 'none',
                    background: mr.id === store.selectedMrId ? '#111827' : 'transparent',
                    color: mr.id === store.selectedMrId ? 'white' : '#1f2933',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{mr.title}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{mr.status}</div>
                </button>
              </li>
            ))}
          </ul>
          <section style={{ marginTop: '1rem' }}>
            <h3>{t('keyboardShortcuts')}</h3>
            <div className="keyboard-grid">
              <span>
                <kbd>↑</kbd> / <kbd>↓</kbd>
              </span>
              <span>Navigate nodes</span>
              <span>
                <kbd>←</kbd> / <kbd>→</kbd>
              </span>
              <span>Collapse or expand</span>
              <span>
                <kbd>Enter</kbd>
              </span>
              <span>Select story</span>
              <span>
                <kbd>Shift</kbd> + click
              </span>
              <span>Toggle recursively</span>
            </div>
          </section>
        </div>
        <div>
          {store.view === 'outline' ? (
            <OutlineTree onPersistExpansion={persistExpansion} />
          ) : (
            <div className="panel">
              <MindmapView tree={tree} selectedId={store.selectedStoryId} onSelect={(id) => store.selectStory(id)} />
            </div>
          )}
        </div>
        <div>
          <DetailPanel story={currentStory} tests={tests} childCount={childCount} />
          <div style={{ marginTop: '1rem' }}>
            <GitHubPanel
              mr={currentMr}
              loading={store.loading}
              onRefresh={() => currentMr && store.refreshBranch(currentMr.id)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function persistExpansion(map: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EXPANSION_KEY, JSON.stringify(map));
}

function safeRead() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(EXPANSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, boolean>;
  } catch (error) {
    console.warn('Failed to parse expansion state', error);
    return null;
  }
}

function expandRecursive(node: any, map: Record<string, boolean>, value: boolean) {
  map[node.id] = value;
  if (Array.isArray(node.children)) {
    node.children.forEach((child: any) => expandRecursive(child, map, value));
  }
}
