import { useCallback, useEffect, useMemo, useState } from 'react';
import { StoryNode } from '../utils/api';

const STORAGE_KEY = 'ai-pm-mindmap:expanded';

type ExpandMode = 'all' | 'none' | 'custom';

const parseQueryExpand = (): { mode: ExpandMode; ids?: string[] } => {
  const params = new URLSearchParams(window.location.search);
  const expand = params.get('expand');
  if (!expand) return { mode: 'custom' };
  if (expand === 'all' || expand === 'none') return { mode: expand };
  if (expand.startsWith('ids:')) {
    return { mode: 'custom', ids: expand.replace('ids:', '').split(',').filter(Boolean) };
  }
  return { mode: 'custom' };
};

const flatten = (nodes: StoryNode[]): string[] => {
  const ids: string[] = [];
  const visit = (node: StoryNode) => {
    ids.push(node.id);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return ids;
};

const findNode = (nodes: StoryNode[], id: string): StoryNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return undefined;
};

export const useTreeExpansion = (mrId: string | undefined, tree: StoryNode[]) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!mrId) return;
    const queryState = parseQueryExpand();
    if (queryState.mode === 'all') {
      setExpanded(new Set(flatten(tree)));
      return;
    }
    if (queryState.mode === 'none') {
      setExpanded(new Set());
      return;
    }
    if (queryState.ids) {
      setExpanded(new Set(queryState.ids));
      return;
    }
    const persistedRaw = localStorage.getItem(`${STORAGE_KEY}:${mrId}`);
    if (persistedRaw) {
      setExpanded(new Set(JSON.parse(persistedRaw)));
    } else {
      setExpanded(new Set(tree.map((node) => node.id)));
    }
  }, [mrId, tree]);

  useEffect(() => {
    if (!mrId) return;
    localStorage.setItem(`${STORAGE_KEY}:${mrId}`, JSON.stringify(Array.from(expanded)));
  }, [mrId, expanded]);

  const isExpanded = useCallback((id: string) => expanded.has(id), [expanded]);

  const toggle = useCallback(
    (id: string, recursive = false) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        if (recursive) {
          const current = findNode(tree, id);
          const walk = (node?: StoryNode) => {
            if (!node) return;
            node.children.forEach((child) => {
              if (next.has(id)) {
                next.add(child.id);
              } else {
                next.delete(child.id);
              }
              walk(child);
            });
          };
          walk(current);
        }
        return next;
      });
    },
    [tree],
  );

  const expandAll = useCallback(() => {
    setExpanded(new Set(flatten(tree)));
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const value = useMemo(
    () => ({ expanded, isExpanded, toggle, expandAll, collapseAll }),
    [expanded, isExpanded, toggle, expandAll, collapseAll],
  );

  return value;
};
