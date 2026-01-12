import type { ReactNode } from 'react';
import React, { createContext, useContext, useMemo } from 'react';

import {
  createPresetPalette,
  type ThemeColors,
} from '@/constants/theme';
import { useThemePreference } from '@/stores';

type DarkModeContextValue = {
  colors: ThemeColors;
  primaryColor: string;
  primarySoftColor: string;
};

const DarkModeContext = createContext<DarkModeContextValue | undefined>(undefined);

export const DarkModeWrapper = ({ children }: { children: ReactNode }) => {
  const { preset } = useThemePreference();
  
  // Force dark mode colors regardless of system preference
  const darkColors = useMemo(
    () => createPresetPalette(preset, 'dark'),
    [preset],
  );

  const value: DarkModeContextValue = useMemo(
    () => ({
      colors: darkColors,
      primaryColor: darkColors.primary,
      primarySoftColor: darkColors.primarySoft,
    }),
    [darkColors],
  );

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkModeTheme = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    // Fallback to regular theme if not wrapped
    return useThemePreference();
  }
  return context;
};
