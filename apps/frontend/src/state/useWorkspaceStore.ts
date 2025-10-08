import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AcceptanceTest, MergeRequest, RollupResult, UserStory } from '@ai-pm/shared';
import { api } from '../lib/api.js';

interface WorkspaceState {
  mergeRequests: MergeRequest[];
  selectedMrId?: string;
  stories: Record<string, UserStory>;
  tests: Record<string, AcceptanceTest>;
  tree: RollupResult[];
  expanded: Record<string, boolean>;
  selectedStoryId?: string;
  loading: boolean;
  error?: string;
  fetchInitial(): Promise<void>;
  selectStory(id?: string): void;
  toggleExpand(id: string, expanded?: boolean): void;
  expandToDepth(depth: number): void;
  expandAll(): void;
  collapseAll(): void;
  addChild(parentId: string | null): Promise<UserStory>;
  addTest(storyId: string): Promise<AcceptanceTest>;
  updateStory(story: UserStory): Promise<UserStory>;
  updateTest(test: AcceptanceTest): Promise<AcceptanceTest>;
  updateBranch(): Promise<void>;
  refreshTree(): Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      mergeRequests: [],
      stories: {},
      tests: {},
      tree: [],
      expanded: {},
      loading: false,
      async fetchInitial() {
        set({ loading: true });
        try {
          const mrs = await api.listMergeRequests();
          const selectedMrId = mrs[0]?.id;
          let stories: UserStory[] = [];
          let tree: RollupResult[] = [];
          if (selectedMrId) {
            stories = await api.getStories(selectedMrId);
            tree = (await api.getStoryTree(selectedMrId)).tree;
          }
          const storyMap: Record<string, UserStory> = {};
          stories.forEach((story) => {
            storyMap[story.id] = story;
          });
          set({
            mergeRequests: mrs,
            selectedMrId,
            stories: storyMap,
            tests: {},
            tree,
            loading: false,
            error: undefined
          });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      selectStory(selectedStoryId) {
        set({ selectedStoryId });
        if (selectedStoryId) {
          set((state) => ({ expanded: { ...state.expanded, [selectedStoryId]: true } }));
        }
      },
      toggleExpand(id, explicit) {
        set((state) => {
          const next = explicit ?? !state.expanded[id];
          return { expanded: { ...state.expanded, [id]: next } };
        });
      },
      expandToDepth(depth) {
        const { stories } = get();
        const expanded: Record<string, boolean> = {};
        Object.values(stories).forEach((story) => {
          if (story.depth < depth) {
            expanded[story.id] = true;
          }
        });
        set({ expanded });
      },
      expandAll() {
        const { stories } = get();
        const expanded: Record<string, boolean> = {};
        Object.values(stories).forEach((story) => {
          expanded[story.id] = true;
        });
        set({ expanded });
      },
      collapseAll() {
        set({ expanded: {} });
      },
      async addChild(parentId) {
        const { selectedMrId } = get();
        if (!selectedMrId) throw new Error('No merge request selected');
        const parent = parentId ? get().stories[parentId] : undefined;
        const story = await api.createStory({
          mrId: selectedMrId,
          parentId: parentId ?? null,
          order: parent ? parent.childrenIds.length : Object.keys(get().stories).length,
          depth: parent ? parent.depth + 1 : 0,
          title: 'New Story',
          asA: '',
          iWant: '',
          soThat: ''
        });
        set((state) => ({ stories: { ...state.stories, [story.id]: story } }));
        get().toggleExpand(parentId ?? story.id, true);
        await get().refreshTree();
        return story;
      },
      async addTest(storyId) {
        const test = await api.createTest(storyId);
        set((state) => ({ tests: { ...state.tests, [test.id]: test } }));
        await get().refreshTree();
        return test;
      },
      async updateStory(story) {
        const updated = await api.updateStory(story);
        set((state) => ({ stories: { ...state.stories, [updated.id]: updated } }));
        await get().refreshTree();
        return updated;
      },
      async updateTest(test) {
        const updated = await api.updateTest(test);
        set((state) => ({ tests: { ...state.tests, [updated.id]: updated } }));
        await get().refreshTree();
        return updated;
      },
      async updateBranch() {
        const { selectedMrId } = get();
        if (!selectedMrId) return;
        await api.updateBranch(selectedMrId);
        await get().fetchInitial();
      },
      async refreshTree() {
        const { selectedMrId } = get();
        if (!selectedMrId) return;
        const [tree, stories] = await Promise.all([
          api.getStoryTree(selectedMrId),
          api.getStories(selectedMrId)
        ]);
        const storyMap: Record<string, UserStory> = {};
        stories.forEach((story) => {
          storyMap[story.id] = story;
        });
        set({ tree: tree.tree, stories: storyMap });
      }
    }),
    {
      name: 'ai-pm-workspace',
      partialize: (state) => ({ expanded: state.expanded })
    }
  )
);
