import type { ReactNode } from 'react';
import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  type ColorSchemeName,
  useColorScheme as useNativeColorScheme,
} from 'react-native';

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

export const ThemePreferenceProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] = useState<ColorSchemePreference>('system');
  const [preset, setPreset] = useState<PresetValue>(DEFAULT_THEME.preset);
  const systemScheme = useNativeColorScheme();

  const effectiveScheme = resolveEffectiveScheme(preference, systemScheme);

  const activePreset = useMemo(
    () => THEMES.find((theme) => theme.value === preset) ?? THEMES[0],
    [preset],
  );

  const primaryColor = activePreset.colors[0];
  const colors = useMemo(
    () => createPresetPalette(preset, effectiveScheme),
    [preset, effectiveScheme],
  );
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

