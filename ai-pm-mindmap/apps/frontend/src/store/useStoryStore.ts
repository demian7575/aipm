import { create } from 'zustand';
import type { AcceptanceTest, MergeRequest, UserStory } from '@ai-pm-mindmap/shared';
import { fetchState, fetchStoryTree, updateBranch } from '../lib/api';

export type ViewMode = 'outline' | 'mindmap';

export interface TreeNode extends UserStory {
  children: TreeNode[];
}

interface StoryState {
  mergeRequests: MergeRequest[];
  stories: UserStory[];
  tests: AcceptanceTest[];
  tree: TreeNode[];
  selectedMrId: string | null;
  selectedStoryId: string | null;
  loading: boolean;
  error: string | null;
  view: ViewMode;
  expanded: Record<string, boolean>;
  initialize: () => Promise<void>;
  selectMergeRequest: (id: string) => void;
  selectStory: (id: string | null) => void;
  refreshTree: (mrId: string) => Promise<void>;
  toggleView: (view: ViewMode) => void;
  toggleExpanded: (id: string) => void;
  setExpanded: (map: Record<string, boolean>) => void;
  refreshBranch: (id: string) => Promise<void>;
}

function buildTree(stories: UserStory[], mrId: string): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const story of stories.filter((s) => s.mrId === mrId)) {
    nodes.set(story.id, { ...story, children: [] });
  }
  for (const story of nodes.values()) {
    if (story.parentId && nodes.has(story.parentId)) {
      nodes.get(story.parentId)!.children.push(story);
    } else {
      roots.push(story);
    }
  }
  const sortRecursive = (list: TreeNode[]) => {
    list.sort((a, b) => a.order - b.order);
    list.forEach((node) => sortRecursive(node.children));
  };
  sortRecursive(roots);
  return roots;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  mergeRequests: [],
  stories: [],
  tests: [],
  tree: [],
  selectedMrId: null,
  selectedStoryId: null,
  loading: false,
  error: null,
  view: 'outline',
  expanded: {},
  async initialize() {
    set({ loading: true, error: null });
    try {
      const snapshot = await fetchState();
      const selectedMrId = snapshot.mergeRequests[0]?.id ?? null;
      const tree = selectedMrId ? buildTree(snapshot.stories, selectedMrId) : [];
      const expanded: Record<string, boolean> = {};
      tree.forEach((node) => {
        expanded[node.id] = true;
      });
      set({
        mergeRequests: snapshot.mergeRequests,
        stories: snapshot.stories,
        tests: snapshot.tests,
        selectedMrId,
        tree,
        expanded,
        loading: false
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load', loading: false });
    }
  },
  selectMergeRequest(id) {
    set({ selectedMrId: id, selectedStoryId: null });
    void get().refreshTree(id);
  },
  selectStory(id) {
    set({ selectedStoryId: id });
  },
  async refreshTree(mrId: string) {
    try {
      const tree = await fetchStoryTree(mrId);
      const expanded = { ...get().expanded };
      tree.forEach((node: TreeNode) => {
        expanded[node.id] = expanded[node.id] ?? true;
      });
      set({ tree, expanded });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to refresh tree' });
    }
  },
  toggleView(view) {
    set({ view });
  },
  toggleExpanded(id) {
    const expanded = { ...get().expanded };
    expanded[id] = !expanded[id];
    set({ expanded });
  },
  setExpanded(map) {
    set({ expanded: map });
  },
  async refreshBranch(id: string) {
    await updateBranch(id);
    await get().initialize();
  }
}));

export function selectCurrentMergeRequest(state: StoryState) {
  return state.mergeRequests.find((mr) => mr.id === state.selectedMrId) ?? null;
}

export function selectCurrentStory(state: StoryState) {
  if (!state.selectedStoryId) return null;
  return state.stories.find((story) => story.id === state.selectedStoryId) ?? null;
}

export function selectTestsForStory(state: StoryState, storyId: string) {
  return state.tests.filter((test) => test.storyId === storyId);
}

export function selectChildren(state: StoryState, parentId: string | null) {
  return state.stories.filter((story) => story.parentId === parentId);
}

export function selectTree(state: StoryState) {
  return state.tree;
}
