import { create } from 'zustand';

interface CelebrationStore {
  showConfetti: boolean;
  triggerConfetti: () => void;
  clearConfetti: () => void;
}

export const useCelebrationStore = create<CelebrationStore>((set) => ({
  showConfetti: false,
  triggerConfetti: () => set({ showConfetti: true }),
  clearConfetti: () => set({ showConfetti: false }),
}));
