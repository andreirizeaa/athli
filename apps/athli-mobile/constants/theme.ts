import type { ColorSchemeName } from 'react-native';

import { tintHex } from '@/utils/colorUtils';

export type PresetValue =
  | 'default'
  | 'underground'
  | 'rose-garden'
  | 'lake-view'
  | 'sunset-glow'
  | 'forest-whisper'
  | 'ocean-breeze'
  | 'lavender-dream';

export type ThemeType = {
  preset: PresetValue;
  radius: 'default' | 'sm' | 'md' | 'lg';
  scale: 'none' | 'sm' | 'md' | 'lg';
  contentLayout: 'full' | 'boxed';
};

export const DEFAULT_THEME: ThemeType = {
  preset: 'default',
  radius: 'default',
  scale: 'none',
  contentLayout: 'full',
} as const;

export const THEMES: {
  name: string;
  value: PresetValue;
  colors: string[];
}[] = [
    {
      name: 'Default',
      value: 'default',
      colors: ['#111827'],
    },
    {
      name: 'Underground',
      value: 'underground',
      colors: ['#11826B'],
    },
    {
      name: 'Rose Garden',
      value: 'rose-garden',
      colors: ['#DA2C38'],
    },
    {
      name: 'Lake View',
      value: 'lake-view',
      colors: ['#0EA5E9'],
    },
    {
      name: 'Sunset Glow',
      value: 'sunset-glow',
      colors: ['#F97316'],
    },
    {
      name: 'Forest Whisper',
      value: 'forest-whisper',
      colors: ['#16A34A'],
    },
    {
      name: 'Ocean Breeze',
      value: 'ocean-breeze',
      colors: ['#2563EB'],
    },
    {
      name: 'Lavender Dream',
      value: 'lavender-dream',
      colors: ['#7C3AED'],
    },
  ];

export type ThemeColors = {
  backgroundPrimary: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  text: string;
  mutedText: string;
  primary: string;
  primaryForeground: string;
  primarySoft: string;
  border: string;
  shadowColor: string;
  translucentBackground: string;
};

export function resolveEffectiveScheme(
  mode: 'light' | 'dark' | 'system',
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

export function createPresetPalette(
  preset: PresetValue,
  scheme: 'light' | 'dark',
): ThemeColors {
  if (preset === 'underground') {
    if (scheme === 'dark') {
      return {
        backgroundPrimary: '#000000',
        backgroundSecondary: '#121212',
        backgroundTertiary: '#1E1E1E',
        surfacePrimary: '#18181b',
        surfaceSecondary: '#2A2A2A',
        surfaceTertiary: '#2F2F2F',
        text: '#E5E7EB',
        mutedText: '#9CA3AF',
        primary: '#0D9488',
        primaryForeground: '#ECFEFF',
        primarySoft: tintHex('#0D9488', 0.85),
        border: '#2F2F2F',
        shadowColor: '#FFFFFF',
        translucentBackground: '#1E1E1E',
      };
    }

    return {
      backgroundPrimary: '#FFFFFF',
      backgroundSecondary: '#FFFFFF',
      backgroundTertiary: '#F9FAFB',
      surfacePrimary: '#F3F4F6',
      surfaceSecondary: '#E5E7EB',
      surfaceTertiary: '#D1D5DB',
      text: '#020617',
      mutedText: '#6B7280',
      primary: '#0D9488',
      primaryForeground: '#ECFEFF',
      primarySoft: tintHex('#0D9488', 0.85),
      border: '#E5E7EB',
      shadowColor: '#000000',
      translucentBackground: '#F9FAFB',
    };
  }

  if (preset === 'rose-garden') {
    if (scheme === 'dark') {
      return {
        backgroundPrimary: '#000000',
        backgroundSecondary: '#121212',
        backgroundTertiary: '#1E1E1E',
        surfacePrimary: '#18181b',
        surfaceSecondary: '#2A2A2A',
        surfaceTertiary: '#2F2F2F',
        text: '#F9FAFB',
        mutedText: '#9CA3AF',
        primary: '#E11D48',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#E11D48', 0.85),
        border: '#2F2F2F',
        shadowColor: '#FFFFFF',
        translucentBackground: '#1E1E1E',
      };
    }

    return {
      backgroundPrimary: '#FFFFFF',
      backgroundSecondary: '#FFFFFF',
      backgroundTertiary: '#F9FAFB',
      surfacePrimary: '#f5f5f4',
      surfaceSecondary: '#E5E7EB',
      surfaceTertiary: '#D1D5DB',
      text: '#111827',
      mutedText: '#6B7280',
      primary: '#E11D48',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#E11D48', 0.85),
      border: '#E5E7EB',
      shadowColor: '#000000',
      translucentBackground: '#F9FAFB',
    };
  }

  if (preset === 'lake-view') {
    if (scheme === 'dark') {
      return {
        backgroundPrimary: '#000000',
        backgroundSecondary: '#121212',
        backgroundTertiary: '#1E1E1E',
        surfacePrimary: '#18181b',
        surfaceSecondary: '#2A2A2A',
        surfaceTertiary: '#2F2F2F',
        text: '#E5E7EB',
        mutedText: '#94A3B8',
        primary: '#0EA5E9',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#0EA5E9', 0.85),
        border: '#2F2F2F',
        shadowColor: '#FFFFFF',
        translucentBackground: '#1E1E1E',
      };
    }

    return {
      backgroundPrimary: '#FFFFFF',
      backgroundSecondary: '#FFFFFF',
      backgroundTertiary: '#F9FAFB',
      surfacePrimary: '#f5f5f4',
      surfaceSecondary: '#E5E7EB',
      surfaceTertiary: '#D1D5DB',
      text: '#0F172A',
      mutedText: '#64748B',
      primary: '#0EA5E9',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#0EA5E9', 0.85),
      border: '#E5E7EB',
      shadowColor: '#000000',
      translucentBackground: '#F9FAFB',
    };
  }

  if (preset === 'sunset-glow') {
    if (scheme === 'dark') {
      return {
        backgroundPrimary: '#000000',
        backgroundSecondary: '#121212',
        backgroundTertiary: '#1E1E1E',
        surfacePrimary: '#18181b',
        surfaceSecondary: '#2A2A2A',
        surfaceTertiary: '#2F2F2F',
        text: '#F9FAFB',
        mutedText: '#9CA3AF',
        primary: '#F97316',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#F97316', 0.85),
        border: '#2F2F2F',
        shadowColor: '#FFFFFF',
        translucentBackground: '#1E1E1E',
      };
    }

    return {
      backgroundPrimary: '#FFFFFF',
      backgroundSecondary: '#FFFFFF',
      backgroundTertiary: '#F9FAFB',
      surfacePrimary: '#f5f5f4',
      surfaceSecondary: '#E5E7EB',
      surfaceTertiary: '#D1D5DB',
      text: '#111827',
      mutedText: '#6B7280',
      primary: '#F97316',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#F97316', 0.85),
      border: '#E5E7EB',
      shadowColor: '#000000',
      translucentBackground: '#F9FAFB',
    };
  }

  if (preset === 'forest-whisper') {
    if (scheme === 'dark') {
      return {
        backgroundPrimary: '#000000',
        backgroundSecondary: '#121212',
        backgroundTertiary: '#1E1E1E',
        surfacePrimary: '#18181b',
        surfaceSecondary: '#2A2A2A',
        surfaceTertiary: '#2F2F2F',
        text: '#E5E7EB',
        mutedText: '#9CA3AF',
        primary: '#16A34A',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#16A34A', 0.85),
        border: '#2F2F2F',
        shadowColor: '#FFFFFF',
        translucentBackground: '#1E1E1E',
      };
    }

    return {
      backgroundPrimary: '#FFFFFF',
      backgroundSecondary: '#FFFFFF',
      backgroundTertiary: '#F9FAFB',
      surfacePrimary: '#f5f5f4',
      surfaceSecondary: '#E5E7EB',
      surfaceTertiary: '#D1D5DB',
      text: '#020617',
      mutedText: '#6B7280',
      primary: '#16A34A',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#16A34A', 0.85),
      border: '#E5E7EB',
      shadowColor: '#000000',
      translucentBackground: '#F9FAFB',
    };
  }

  if (preset === 'ocean-breeze') {
    if (scheme === 'dark') {
      return {
        backgroundPrimary: '#000000',
        backgroundSecondary: '#121212',
        backgroundTertiary: '#1E1E1E',
        surfacePrimary: '#18181b',
        surfaceSecondary: '#2A2A2A',
        surfaceTertiary: '#2F2F2F',
        text: '#E5E7EB',
        mutedText: '#9CA3AF',
        primary: '#2563EB',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#2563EB', 0.85),
        border: '#2F2F2F',
        shadowColor: '#FFFFFF',
        translucentBackground: '#1E1E1E',
      };
    }

    return {
      backgroundPrimary: '#FFFFFF',
      backgroundSecondary: '#FFFFFF',
      backgroundTertiary: '#F9FAFB',
      surfacePrimary: '#f5f5f4',
      surfaceSecondary: '#E5E7EB',
      surfaceTertiary: '#D1D5DB',
      text: '#020617',
      mutedText: '#6B7280',
      primary: '#2563EB',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#2563EB', 0.85),
      border: '#E5E7EB',
      shadowColor: '#000000',
      translucentBackground: '#F9FAFB',
    };
  }

  if (preset === 'lavender-dream') {
    if (scheme === 'dark') {
      return {
        backgroundPrimary: '#000000',
        backgroundSecondary: '#121212',
        backgroundTertiary: '#1E1E1E',
        surfacePrimary: '#18181b',
        surfaceSecondary: '#2A2A2A',
        surfaceTertiary: '#2F2F2F',
        text: '#E5E7EB',
        mutedText: '#9CA3AF',
        primary: '#7C3AED',
        primaryForeground: '#FFFFFF',
        primarySoft: tintHex('#7C3AED', 0.85),
        border: '#2F2F2F',
        shadowColor: '#FFFFFF',
        translucentBackground: '#1E1E1E',
      };
    }

    return {
      backgroundPrimary: '#FFFFFF',
      backgroundSecondary: '#FFFFFF',
      backgroundTertiary: '#F9FAFB',
      surfacePrimary: '#f5f5f4',
      surfaceSecondary: '#E5E7EB',
      surfaceTertiary: '#D1D5DB',
      text: '#111827',
      mutedText: '#6B7280',
      primary: '#7C3AED',
      primaryForeground: '#FFFFFF',
      primarySoft: tintHex('#7C3AED', 0.85),
      border: '#E5E7EB',
      shadowColor: '#000000',
      translucentBackground: '#F9FAFB',
    };
  }

  if (scheme === 'dark') {
    return {
      backgroundPrimary: '#000000',
      backgroundSecondary: '#121212',
      backgroundTertiary: '#1E1E1E',
      surfacePrimary: '#18181b',
      surfaceSecondary: '#2A2A2A',
      surfaceTertiary: '#2F2F2F',
      text: '#E5E7EB',
      mutedText: '#9CA3AF',
      primary: '#FFFFFF',
      primaryForeground: '#000000',
      primarySoft: tintHex('#FFFFFF', 0.85),
      border: '#2F2F2F',
      shadowColor: '#FFFFFF',
      translucentBackground: '#1E1E1E',
    };
  }

  return {
    backgroundPrimary: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    backgroundTertiary: '#F3F4F6',
    surfacePrimary: '#f5f5f4',
    surfaceSecondary: '#E5E7EB',
    surfaceTertiary: '#D1D5DB',
    text: '#020617',
    mutedText: '#6B7280',
    primary: '#000000',
    primaryForeground: '#FFFFFF',
    primarySoft: tintHex('#000000', 0.85),
    border: '#E5E7EB',
    shadowColor: '#000000',
    translucentBackground: '#F9FAFB',
  };
}

