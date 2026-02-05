import { create } from 'zustand';
import { Storage } from '@/lib/storage';
import { setHapticsEnabled } from '@/utils/haptics';

const HAPTICS_STORAGE_KEY = '@athli:haptics_enabled';

type HapticsStore = {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  initialize: () => void;
};

export const useHapticsStore = create<HapticsStore>((set) => ({
  hapticsEnabled: true,

  setHapticsEnabled: (enabled: boolean) => {
    try {
      Storage.setItem(HAPTICS_STORAGE_KEY, JSON.stringify(enabled));
      setHapticsEnabled(enabled);
      set({ hapticsEnabled: enabled });
    } catch (error) {
      console.error('Failed to save haptics preference:', error);
    }
  },

  initialize: () => {
    try {
      const stored = Storage.getItem(HAPTICS_STORAGE_KEY);
      if (stored !== undefined) {
        const enabled = JSON.parse(stored);
        setHapticsEnabled(enabled);
        set({ hapticsEnabled: enabled });
      }
    } catch (error) {
      console.error('Failed to load haptics preference:', error);
    }
  },
}));

/**
 * Hook to access haptics preferences (backward compatible)
 */
export const useHaptics = () => {
  const hapticsEnabled = useHapticsStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useHapticsStore((state) => state.setHapticsEnabled);

  return { hapticsEnabled, setHapticsEnabled };
};
