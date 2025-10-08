import { create } from 'zustand';
import type { StoryTreeNode } from '@ai-pm/shared/types';

export type ViewMode = 'outline' | 'mindmap';

const EXPANSION_KEY = 'aipm.expanded';

function loadExpansion(): string[] {
  try {
    const stored = localStorage.getItem(EXPANSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load expansion state', error);
  }
  return [];
}

function persistExpansion(ids: string[]) {
  try {
    localStorage.setItem(EXPANSION_KEY, JSON.stringify(ids));
  } catch (error) {
    console.warn('Failed to persist expansion state', error);
  }
}

export interface StoriesState {
  viewMode: ViewMode;
  expandedIds: string[];
  selectedStoryId?: string;
  tree: StoryTreeNode[];
  setTree: (nodes: StoryTreeNode[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelected: (id: string | undefined) => void;
  toggleNode: (id: string) => void;
  expandAll: (ids: string[]) => void;
  collapseAll: () => void;
  expandToDepth: (depth: number, nodes: StoryTreeNode[]) => void;
  applyQueryExpansion: (query: string | null, nodes: StoryTreeNode[]) => void;
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  viewMode: 'outline',
  expandedIds: typeof window !== 'undefined' ? loadExpansion() : [],
  tree: [],
  setTree: (nodes) => set({ tree: nodes }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelected: (id) => set({ selectedStoryId: id }),
  toggleNode: (id) => {
    const expanded = new Set(get().expandedIds);
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
    }
    const ids = Array.from(expanded);
    set({ expandedIds: ids });
    persistExpansion(ids);
  },
  expandAll: (ids) => {
    const unique = Array.from(new Set(ids));
    set({ expandedIds: unique });
    persistExpansion(unique);
  },
  collapseAll: () => {
    set({ expandedIds: [] });
    persistExpansion([]);
  },
  expandToDepth: (depth, nodes) => {
    const ids = collectByDepth(nodes, depth);
    set({ expandedIds: ids });
    persistExpansion(ids);
  },
  applyQueryExpansion: (query, nodes) => {
    if (!query) return;
    if (query === 'all') {
      const ids = collectAllIds(nodes);
      set({ expandedIds: ids });
      persistExpansion(ids);
      return;
    }
    if (query === 'none') {
      set({ expandedIds: [] });
      persistExpansion([]);
      return;
    }
    if (query.startsWith('ids:')) {
      const ids = query.replace('ids:', '').split(',').filter(Boolean);
      set({ expandedIds: ids });
      persistExpansion(ids);
      return;
    }
    if (query.startsWith('depth:')) {
      const depth = Number(query.replace('depth:', ''));
      if (!Number.isNaN(depth)) {
        const ids = collectByDepth(nodes, depth);
        set({ expandedIds: ids });
        persistExpansion(ids);
      }
    }
  }
}));

function collectAllIds(nodes: StoryTreeNode[], depth = Infinity, current = 1, acc: string[] = []): string[] {
  for (const node of nodes) {
    if (current <= depth) {
      acc.push(node.story.id);
      collectAllIds(node.children, depth, current + 1, acc);
    }
  }
  return acc;
}

function collectByDepth(nodes: StoryTreeNode[], depth: number): string[] {
  return collectAllIds(nodes, depth);
}

export function getAllStoryIds(nodes: StoryTreeNode[]): string[] {
  return collectAllIds(nodes);
}
