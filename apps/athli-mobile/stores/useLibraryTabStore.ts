import { create } from 'zustand';

export type LibraryTab =
  | 'workouts'
  | 'sections'
  | 'programs'
  | 'exercises'
  | 'checkIns'
  | 'questionnaires'
  | 'metrics'
  | 'habits'
  | 'files';

type LibraryTabStore = {
  currentLibraryTab: LibraryTab;
  setCurrentLibraryTab: (tab: LibraryTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  openRowCloseFn: (() => void) | null;
  registerOpenRow: (closeFn: () => void) => void;
  closeOpenRow: () => void;
};

export const useLibraryTabStore = create<LibraryTabStore>((set, get) => ({
  currentLibraryTab: 'workouts',
  setCurrentLibraryTab: (tab) => set({ currentLibraryTab: tab }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  openRowCloseFn: null,

  registerOpenRow: (closeFn) => {
    const state = get();
    // Close any previously open row
    if (state.openRowCloseFn && state.openRowCloseFn !== closeFn) {
      state.openRowCloseFn();
    }
    set({ openRowCloseFn: closeFn });
  },

  closeOpenRow: () => {
    const state = get();
    if (state.openRowCloseFn) {
      state.openRowCloseFn();
      set({ openRowCloseFn: null });
    }
  },
}));
