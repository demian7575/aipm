import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { StoryTreeNode } from '@ai-pm/shared/types';
import OutlineTree from '../components/OutlineTree';
import Mindmap from '../components/Mindmap';
import DetailPanel from '../components/DetailPanel';
import GithubPanel from '../components/GithubPanel';
import { fetchMergeRequests, fetchStoryTree, moveStory } from '../lib/api';
import { I18nProvider, useI18n } from '../lib/i18n';
import { useStoriesStore, getAllStoryIds } from '../store/useStoriesStore';

function AppContent() {
  const queryClient = useQueryClient();
  const {
    tree,
    setTree,
    applyQueryExpansion,
    expandAll,
    collapseAll,
    expandToDepth,
    viewMode,
    setViewMode,
    setSelected,
    selectedStoryId
  } = useStoriesStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, locale, setLocale } = useI18n();

  const { data: mergeRequests } = useQuery({ queryKey: ['merge-requests'], queryFn: fetchMergeRequests });
  const [mrId, setMrId] = useState<string | undefined>();

  useEffect(() => {
    if (!mrId && mergeRequests && mergeRequests.length > 0) {
      setMrId(mergeRequests[0].id);
    }
  }, [mergeRequests, mrId]);

  useEffect(() => {
    setSelected(undefined);
  }, [mrId, setSelected]);

  const treeQuery = useQuery({
    queryKey: ['stories', mrId],
    queryFn: () => (mrId ? fetchStoryTree(mrId) : Promise.resolve([])),
    enabled: Boolean(mrId)
  });

  useEffect(() => {
    if (treeQuery.data) {
      setTree(treeQuery.data);
      const expandQuery = searchParams.get('expand');
      applyQueryExpansion(expandQuery, treeQuery.data);
      if (!selectedStoryId && treeQuery.data[0]) {
        setSelected(treeQuery.data[0].story.id);
      }
    }
  }, [treeQuery.data, searchParams, applyQueryExpansion, selectedStoryId, setSelected, setTree]);

  const allIds = useMemo(() => getAllStoryIds(tree), [tree]);

  const handleExpandAll = () => {
    expandAll(allIds);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('expand', 'all');
      return params;
    });
  };

  const handleCollapseAll = () => {
    collapseAll();
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('expand', 'none');
      return params;
    });
  };

  const handleExpandDepth = (depth: number) => {
    expandToDepth(depth, tree);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('expand', `depth:${depth}`);
      return params;
    });
  };

  const selectedMr = mergeRequests?.find((mr) => mr.id === mrId);

  const canMove = (storyId: string, parentId: string | null) => {
    if (!parentId) return true;
    if (storyId === parentId) return false;
    return !containsDescendant(storyId, parentId, tree);
  };

  const handleMove = async (storyId: string, parentId: string | null, index: number) => {
    if (!canMove(storyId, parentId)) {
      alert('Cannot move story to its own descendant.');
      return;
    }
    await moveStory(storyId, parentId, index);
    await queryClient.invalidateQueries({ queryKey: ['stories', mrId] });
  };

  return (
    <main>
      <div className="app-shell">
        <header className="controls" role="toolbar" aria-label="View controls">
          <select value={mrId} onChange={(event) => setMrId(event.target.value)} aria-label="Merge request selector">
            {mergeRequests?.map((mr) => (
              <option key={mr.id} value={mr.id}>
                {mr.title}
              </option>
            ))}
          </select>
          <button onClick={handleExpandAll}>{t('expandAll')}</button>
          <button onClick={handleCollapseAll}>{t('collapseAll')}</button>
          <label>
            {t('expandDepth')}:{' '}
            <input
              type="number"
              min={1}
              max={6}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isNaN(value)) {
                  handleExpandDepth(value);
                }
              }}
            />
          </label>
          <button onClick={() => setViewMode('outline')} aria-pressed={viewMode === 'outline'}>
            {t('outline')}
          </button>
          <button onClick={() => setViewMode('mindmap')} aria-pressed={viewMode === 'mindmap'}>
            {t('mindmap')}
          </button>
          <select value={locale} onChange={(event) => setLocale(event.target.value as any)} aria-label="Locale">
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </header>
        <section className="view-container">
          <OutlineTree
            nodes={tree}
            onMove={handleMove}
            canMove={canMove}
            className={viewMode === 'outline' ? 'active' : 'inactive'}
            hidden={viewMode === 'mindmap'}
          />
          <Mindmap
            nodes={tree}
            onSelect={(id) => setSelected(id)}
            className={viewMode === 'mindmap' ? 'active' : 'inactive'}
            hidden={viewMode === 'outline'}
          />
        </section>
        <DetailPanel storyId={selectedStoryId} tree={tree} />
        <GithubPanel mergeRequest={selectedMr} />
      </div>
    </main>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

function containsDescendant(storyId: string, parentCandidate: string, tree: StoryTreeNode[]): boolean {
  for (const node of tree) {
    if (node.story.id === storyId) {
      return findDescendant(node, parentCandidate);
    }
    if (containsDescendant(storyId, parentCandidate, node.children)) {
      return true;
    }
  }
  return false;
}

function findDescendant(node: any, id: string): boolean {
  for (const child of node.children) {
    if (child.story.id === id || findDescendant(child, id)) {
      return true;
    }
  }
  return false;
}
