import { create } from 'zustand';

export type AppView = 'athlete' | 'coach';

type AppViewStore = {
  appView: AppView;
  setAppView: (view: AppView) => void;
};

export const useAppViewStore = create<AppViewStore>((set) => ({
  appView: 'coach',
  setAppView: (view) => set({ appView: view }),
}));
