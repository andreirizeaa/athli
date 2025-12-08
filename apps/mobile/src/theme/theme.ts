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
  preset: 'sunset-glow',
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


