import { create } from 'zustand';

type AppInitState = {
  isAppReady: boolean;
  setAppReady: (ready: boolean) => void;
};

export const useAppInitStore = create<AppInitState>((set) => ({
  isAppReady: false,
  setAppReady: (ready) => set({ isAppReady: ready }),
}));
