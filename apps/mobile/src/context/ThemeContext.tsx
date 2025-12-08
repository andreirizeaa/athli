import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME, PresetValue, ThemeType } from '../theme/theme';
import { tintHex } from '../utils/colorUtils';

type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  mutedText: string;
  primary: string;
  primaryForeground: string;
  primarySoft: string;
  border: string;
  sidebar: string;
  sidebarForeground: string;
};

type ThemeContextType = {
  mode: ThemeMode;
  colorScheme: 'light' | 'dark';
  theme: ThemeType;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  setPreset: (preset: PresetValue) => void;
  setTheme: (updater: ThemeType | ((previous: ThemeType) => ThemeType)) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@athli/mobile-theme';

function resolveEffectiveScheme(
  mode: ThemeMode,
  systemScheme: ColorSchemeName,
): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') {
    return mode;
  }

  if (systemScheme === 'dark') {
    return 'dark';
  }

  return 'light';
}

function createPresetPalette(
  preset: PresetValue,
  scheme: 'light' | 'dark',
): ThemeColors {
  if (preset === 'underground') {
    if (scheme === 'dark') {
      return {
        background: '#121212',
        surface: '#1E1E1E',
        surfaceSecondary: '#2A2A2A',
        text: '#E5E7EB',
        mutedText: '#9CA3AF',
        primary: '#0D9488',
        primaryForeground: '#ECFEFF',
        primarySoft: tintHex('#0D9488', 0.85),
        border: '#2F2F2F',
        sidebar: '#1A1A1A',
        sidebarForeground: '#E5E7EB',
      };
    }

    return {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceSecondary: '#F3F4F6',
      text: '#020617',
      mutedText: '#6B7280',
      primary: '#0D9488',
      primaryForeground: '#ECFEFF',
      primarySoft: tintHex('#0D9488', 0.85),
      border: '#E5E7EB',
      sidebar: '#F9FAFB',
      sidebarForeground: '#020617',
    };
  }

  if (preset === 'rose-garden') {
    if (scheme === 'dark') {
      return {
        background: '#121212',
        surface: '#1E1E1E',
        surfaceSecondary: '#2A2A2A',
        text: '#F9FAFB',
        mutedText: '#9CA3AF',
        primary: '#E11D48',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#E11D48', 0.85),
        border: '#2F2F2F',
        sidebar: '#1A1A1A',
        sidebarForeground: '#F9FAFB',
      };
    }

    return {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceSecondary: '#F3F4F6',
      text: '#111827',
      mutedText: '#6B7280',
      primary: '#E11D48',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#E11D48', 0.85),
      border: '#E5E7EB',
      sidebar: '#F9FAFB',
      sidebarForeground: '#111827',
    };
  }

  if (preset === 'lake-view') {
    if (scheme === 'dark') {
      return {
        background: '#121212',
        surface: '#1E1E1E',
        surfaceSecondary: '#2A2A2A',
        text: '#E5E7EB',
        mutedText: '#94A3B8',
        primary: '#0EA5E9',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#0EA5E9', 0.85),
        border: '#2F2F2F',
        sidebar: '#1A1A1A',
        sidebarForeground: '#E5E7EB',
      };
    }

    return {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceSecondary: '#F3F4F6',
      text: '#0F172A',
      mutedText: '#64748B',
      primary: '#0EA5E9',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#0EA5E9', 0.85),
      border: '#E5E7EB',
      sidebar: '#F9FAFB',
      sidebarForeground: '#0F172A',
    };
  }

  if (preset === 'sunset-glow') {
    if (scheme === 'dark') {
      return {
        background: '#121212',
        surface: '#1E1E1E',
        surfaceSecondary: '#2A2A2A',
        text: '#F9FAFB',
        mutedText: '#9CA3AF',
        primary: '#F97316',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#F97316', 0.85),
        border: '#2F2F2F',
        sidebar: '#1A1A1A',
        sidebarForeground: '#F9FAFB',
      };
    }

    return {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceSecondary: '#F3F4F6',
      text: '#111827',
      mutedText: '#6B7280',
      primary: '#F97316',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#F97316', 0.85),
      border: '#E5E7EB',
      sidebar: '#F9FAFB',
      sidebarForeground: '#111827',
    };
  }

  if (preset === 'forest-whisper') {
    if (scheme === 'dark') {
      return {
        background: '#121212',
        surface: '#1E1E1E',
        surfaceSecondary: '#2A2A2A',
        text: '#E5E7EB',
        mutedText: '#9CA3AF',
        primary: '#16A34A',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#16A34A', 0.85),
        border: '#2F2F2F',
        sidebar: '#1A1A1A',
        sidebarForeground: '#E5E7EB',
      };
    }

    return {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceSecondary: '#F3F4F6',
      text: '#020617',
      mutedText: '#6B7280',
      primary: '#16A34A',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#16A34A', 0.85),
      border: '#E5E7EB',
      sidebar: '#F9FAFB',
      sidebarForeground: '#020617',
    };
  }

  if (preset === 'ocean-breeze') {
    if (scheme === 'dark') {
      return {
        background: '#121212',
        surface: '#1E1E1E',
        surfaceSecondary: '#2A2A2A',
        text: '#E5E7EB',
        mutedText: '#9CA3AF',
        primary: '#2563EB',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#2563EB', 0.85),
        border: '#2F2F2F',
        sidebar: '#1A1A1A',
        sidebarForeground: '#E5E7EB',
      };
    }

    return {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceSecondary: '#F3F4F6',
      text: '#020617',
      mutedText: '#6B7280',
      primary: '#2563EB',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#2563EB', 0.85),
      border: '#E5E7EB',
      sidebar: '#F9FAFB',
      sidebarForeground: '#020617',
    };
  }

  if (preset === 'lavender-dream') {
    if (scheme === 'dark') {
      return {
        background: '#121212',
        surface: '#1E1E1E',
        surfaceSecondary: '#2A2A2A',
        text: '#E5E7EB',
        mutedText: '#9CA3AF',
        primary: '#7C3AED',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#7C3AED', 0.85),
        border: '#2F2F2F',
        sidebar: '#1A1A1A',
        sidebarForeground: '#E5E7EB',
      };
    }

    return {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceSecondary: '#F3F4F6',
      text: '#111827',
      mutedText: '#6B7280',
      primary: '#7C3AED',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#7C3AED', 0.85),
      border: '#E5E7EB',
      sidebar: '#F9FAFB',
      sidebarForeground: '#111827',
    };
  }

  if (scheme === 'dark') {
    return {
      background: '#121212',
      surface: '#1E1E1E',
      surfaceSecondary: '#2A2A2A',
      text: '#E5E7EB',
      mutedText: '#9CA3AF',
      primary: '#FFFFFF',
      primaryForeground: '#000000',
      primarySoft: tintHex('#FFFFFF', 0.85),
      border: '#2F2F2F',
      sidebar: '#1A1A1A',
      sidebarForeground: '#E5E7EB',
    };
  }

  return {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceSecondary: '#F3F4F6',
    text: '#020617',
    mutedText: '#6B7280',
    primary: '#000000',
    primaryForeground: '#FFFFFF',
    primarySoft: tintHex('#000000', 0.85),
    border: '#E5E7EB',
    sidebar: '#FFFFFF',
    sidebarForeground: '#020617',
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState<ThemeType>(DEFAULT_THEME);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener((change) => {
      setSystemScheme(change.colorScheme);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!stored) {
          return;
        }

        const parsed = JSON.parse(
          stored,
        ) as Partial<{ mode: ThemeMode; theme: ThemeType }>;

        if (parsed.mode) {
          setMode(parsed.mode);
        }

        if (parsed.theme) {
          setTheme(parsed.theme);
        }
      } catch {
        // Ignore storage errors and fall back to defaults.
      }
    };

    void loadTheme();
  }, []);

  useEffect(() => {
    const persistTheme = async () => {
      try {
        const payload = JSON.stringify({ mode, theme });
        await AsyncStorage.setItem(THEME_STORAGE_KEY, payload);
      } catch {
        // Ignore storage errors and keep theme in memory only.
      }
    };

    void persistTheme();
  }, [mode, theme]);

  const colorScheme = resolveEffectiveScheme(mode, systemScheme);

  const colors = useMemo(
    () => createPresetPalette(theme.preset, colorScheme),
    [theme.preset, colorScheme],
  );

  const handleSetMode = (nextMode: ThemeMode) => {
    setMode(nextMode);
  };

  const handleSetPreset = (preset: PresetValue) => {
    setTheme((previous) => ({
      ...previous,
      preset,
    }));
  };

  const handleSetTheme = (
    updater: ThemeType | ((previous: ThemeType) => ThemeType),
  ) => {
    setTheme((previous) =>
      typeof updater === 'function' ? updater(previous) : updater,
    );
  };

  const value: ThemeContextType = useMemo(
    () => ({
      mode,
      colorScheme,
      theme,
      colors,
      setMode: handleSetMode,
      setPreset: handleSetPreset,
      setTheme: handleSetTheme,
    }),
    [mode, colorScheme, theme, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}


