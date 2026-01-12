import { create } from 'zustand';

type TrainingOverlayStore = {
  isVisible: boolean;
  showOverlay: () => void;
  hideOverlay: () => void;
};

export const useTrainingOverlayStore = create<TrainingOverlayStore>((set) => ({
  isVisible: false,
  showOverlay: () => set({ isVisible: true }),
  hideOverlay: () => set({ isVisible: false }),
}));
