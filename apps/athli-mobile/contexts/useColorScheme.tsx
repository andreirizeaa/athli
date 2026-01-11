import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  type ColorSchemeName,
  useColorScheme as useNativeColorScheme,
} from 'react-native';
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

type ThemePreferenceContextValue = {
  preference: ColorSchemePreference;
  setPreference: (preference: ColorSchemePreference) => void;
  preset: PresetValue;
  setPreset: (preset: PresetValue) => void;
  primaryColor: string;
  primarySoftColor: string;
  colors: ThemeColors;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(
  undefined,
);

const THEME_PREFERENCE_KEY = '@athli:theme_preference';
const COLOR_PALETTE_KEY = '@athli:color_palette';

export const ThemePreferenceProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ColorSchemePreference>('system');
  const [preset, setPresetState] = useState<PresetValue>(DEFAULT_THEME.preset);
  const systemScheme = useNativeColorScheme();

  useEffect(() => {
    const loadPreferences = () => {
      try {
        const savedPreference = Storage.getItem(THEME_PREFERENCE_KEY);
        const savedPreset = Storage.getItem(COLOR_PALETTE_KEY);

        if (savedPreference && (savedPreference === 'light' || savedPreference === 'dark' || savedPreference === 'system')) {
          setPreferenceState(savedPreference as ColorSchemePreference);
        }

        if (savedPreset) {
          const validPreset = THEMES.find((theme) => theme.value === savedPreset);
          if (validPreset) {
            setPresetState(savedPreset as PresetValue);
          }
        }
      } catch (error) {
        // Ignore errors and use defaults
      }
    };

    loadPreferences();
  }, []);

  const setPreference = (newPreference: ColorSchemePreference) => {
    setPreferenceState(newPreference);
    try {
      Storage.setItem(THEME_PREFERENCE_KEY, newPreference);
    } catch (error) {
      // Ignore errors
    }
  };

  const setPreset = (newPreset: PresetValue) => {
    setPresetState(newPreset);
    try {
      Storage.setItem(COLOR_PALETTE_KEY, newPreset);
    } catch (error) {
      // Ignore errors
    }
  };

  const effectiveScheme = resolveEffectiveScheme(preference, systemScheme);

  const activePreset = useMemo(
    () => THEMES.find((theme) => theme.value === preset) ?? THEMES[0],
    [preset],
  );

  const colors = useMemo(
    () => createPresetPalette(preset, effectiveScheme),
    [preset, effectiveScheme],
  );
  
  // Use palette primary color which adapts to light/dark mode correctly
  // For default theme: black (#000000) in light mode, white (#FFFFFF) in dark mode
  // For other themes: uses the theme's color
  const primaryColor = colors.primary;
  const primarySoftColor = colors.primarySoft;

  const value: ThemePreferenceContextValue = useMemo(
    () => ({
      preference,
      setPreference,
      preset,
      setPreset,
      primaryColor,
      primarySoftColor,
      colors,
    }),
    [preference, preset, primaryColor, primarySoftColor, colors],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
};

export const useThemePreference = () => {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  }

  return context;
};

export const useColorScheme = (): NonNullable<ColorSchemeName> => {
  const systemScheme = useNativeColorScheme() ?? 'light';
  const context = useContext(ThemePreferenceContext);

  if (!context || context.preference === 'system') {
    return systemScheme;
  }

  return context.preference;
};

