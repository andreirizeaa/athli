import { create } from 'zustand';
import { useColorScheme as useNativeColorScheme, Appearance } from 'react-native';
import { Storage } from '@/lib/storage';
import {
  DEFAULT_THEME,
  THEMES,
  createPresetPalette,
  resolveEffectiveScheme,
  type PresetValue,
  type ThemeColors,
} from '@/constants/theme';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

const THEME_PREFERENCE_KEY = '@athli:theme_preference';
const COLOR_PALETTE_KEY = '@athli:color_palette';

type ThemeStore = {
  // State
  preference: ColorSchemePreference;
  preset: PresetValue;
  isInitialized: boolean;

  // Computed values
  colors: ThemeColors;
  primaryColor: string;
  primarySoftColor: string;

  // Actions
  setPreference: (preference: ColorSchemePreference) => void;
  setPreset: (preset: PresetValue) => void;
  initialize: () => void;
  updateColorsFromSystemScheme: (systemScheme: 'light' | 'dark') => void;
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  // Initial state
  preference: 'system',
  preset: DEFAULT_THEME.preset,
  isInitialized: false,
  colors: createPresetPalette(DEFAULT_THEME.preset, 'light'),
  primaryColor: createPresetPalette(DEFAULT_THEME.preset, 'light').primary,
  primarySoftColor: createPresetPalette(DEFAULT_THEME.preset, 'light').primarySoft,

  // Initialize from storage (idempotent - only runs once)
  initialize: () => {
    // Skip if already initialized
    if (get().isInitialized) {
      return;
    }

    try {
      const savedPreference = Storage.getItem(THEME_PREFERENCE_KEY);
      const savedPreset = Storage.getItem(COLOR_PALETTE_KEY);

      const updates: Partial<ThemeStore> = { isInitialized: true };

      if (
        savedPreference &&
        (savedPreference === 'light' || savedPreference === 'dark' || savedPreference === 'system')
      ) {
        updates.preference = savedPreference as ColorSchemePreference;
      }

      if (savedPreset) {
        const validPreset = THEMES.find((theme) => theme.value === savedPreset);
        if (validPreset) {
          updates.preset = savedPreset as PresetValue;
        }
      }

      // Always update to mark as initialized
      const state = get();
      const preference = updates.preference ?? state.preference;
      const preset = updates.preset ?? state.preset;
      const systemScheme = Appearance.getColorScheme() ?? 'light';
      const effectiveScheme = resolveEffectiveScheme(preference, systemScheme);
      const colors = createPresetPalette(preset, effectiveScheme);

      set({
        ...updates,
        colors,
        primaryColor: colors.primary,
        primarySoftColor: colors.primarySoft,
      });
    } catch (error) {
      // Mark as initialized even on error to prevent retry loops
      set({ isInitialized: true });
      console.error('Failed to load theme preferences:', error);
    }
  },

  // Update colors based on system scheme change
  updateColorsFromSystemScheme: (systemScheme) => {
    const state = get();
    const effectiveScheme = resolveEffectiveScheme(state.preference, systemScheme);
    const colors = createPresetPalette(state.preset, effectiveScheme);

    set({
      colors,
      primaryColor: colors.primary,
      primarySoftColor: colors.primarySoft,
    });

    // Update native appearance
    if (state.preference === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(state.preference);
    }
  },

  // Set theme preference
  setPreference: (preference) => {
    try {
      Storage.setItem(THEME_PREFERENCE_KEY, preference);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }

    const systemScheme = Appearance.getColorScheme() ?? 'light';
    const effectiveScheme = resolveEffectiveScheme(preference, systemScheme);
    const state = get();
    const colors = createPresetPalette(state.preset, effectiveScheme);

    // Update native appearance
    if (preference === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(preference);
    }

    set({
      preference,
      colors,
      primaryColor: colors.primary,
      primarySoftColor: colors.primarySoft,
    });
  },

  // Set color preset
  setPreset: (preset) => {
    try {
      Storage.setItem(COLOR_PALETTE_KEY, preset);
    } catch (error) {
      console.error('Failed to save color preset:', error);
    }

    const state = get();
    const systemScheme = Appearance.getColorScheme() ?? 'light';
    const effectiveScheme = resolveEffectiveScheme(state.preference, systemScheme);
    const colors = createPresetPalette(preset, effectiveScheme);

    set({
      preset,
      colors,
      primaryColor: colors.primary,
      primarySoftColor: colors.primarySoft,
    });
  },
}));

// Hook to get current color scheme (respects preference)
export const useColorScheme = (): 'light' | 'dark' => {
  const systemScheme = useNativeColorScheme() ?? 'light';

  try {
    const preference = useThemeStore((state) => state.preference);
    if (preference === 'system') {
      return systemScheme;
    }
    return preference;
  } catch {
    // Fallback to system scheme if store not available
    return systemScheme;
  }
};
