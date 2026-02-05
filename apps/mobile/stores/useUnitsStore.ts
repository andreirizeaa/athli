import { create } from 'zustand';
import { Storage } from '@/lib/storage';

export type UnitsPreference = 'metric' | 'imperial';

const UNITS_KEY = '@athli:units_preference';

type UnitsStore = {
  units: UnitsPreference;
  setUnits: (units: UnitsPreference) => void;
  initialize: () => void;
};

export const useUnitsStore = create<UnitsStore>((set) => ({
  units: 'metric',

  initialize: () => {
    try {
      const savedUnits = Storage.getItem(UNITS_KEY);
      if (savedUnits === 'metric' || savedUnits === 'imperial') {
        set({ units: savedUnits });
      }
    } catch (error) {
      console.error('Failed to load units preference:', error);
    }
  },

  setUnits: (newUnits) => {
    try {
      Storage.setItem(UNITS_KEY, newUnits);
    } catch (error) {
      console.error('Failed to save units preference:', error);
    }
    set({ units: newUnits });
  },
}));
