import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ViewMode = 'outline' | 'mindmap';

export interface StoryStoreState {
  selectedMrId: string | null;
  selectedStoryId: string | null;
  view: ViewMode;
  locale: 'en' | 'ko';
  expanded: Record<string, boolean>;
  setView: (view: ViewMode) => void;
  setLocale: (locale: 'en' | 'ko') => void;
  selectMr: (id: string) => void;
  selectStory: (id: string | null) => void;
  toggleExpanded: (id: string, value?: boolean) => void;
  setExpanded: (next: Record<string, boolean>) => void;
}

const STORAGE_KEY = 'ai-pm-mindmap-expanded';

const loadExpanded = (): Record<string, boolean> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : {};
  } catch (error) {
    console.warn('Failed to load expanded state', error);
    return {};
  }
};

const persistExpanded = (expanded: Record<string, boolean>) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded));
};

export const useStoryStore = create<StoryStoreState>()(
  devtools((set) => ({
    selectedMrId: null,
    selectedStoryId: null,
    view: 'outline',
    locale: 'en',
    expanded: loadExpanded(),
    setView: (view) => set({ view }),
    setLocale: (locale) => set({ locale }),
    selectMr: (id) => set({ selectedMrId: id }),
    selectStory: (id) => set({ selectedStoryId: id }),
    toggleExpanded: (id, value) =>
      set((state) => {
        const next = { ...state.expanded, [id]: value ?? !state.expanded[id] };
        persistExpanded(next);
        return { expanded: next };
      }),
    setExpanded: (next) => {
      persistExpanded(next);
      set({ expanded: next });
    }
  }))
);
