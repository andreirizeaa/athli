import { create } from 'zustand';

export type AppView = 'athlete' | 'coach';

type AppViewStore = {
  appView: AppView;
  setAppView: (view: AppView) => void;
};

export const useAppViewStore = create<AppViewStore>((set) => ({
  // Default to athlete to avoid accidentally rendering coach data
  // when the app view hasn't been resolved from auth/profile yet.
  appView: 'athlete',
  setAppView: (view) => set({ appView: view }),
}));
