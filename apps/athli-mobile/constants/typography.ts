import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';

export type HeadingVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'h7' | 'h8';
export type ParagraphVariant = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7' | 'p8';

export type TextVariant = HeadingVariant | ParagraphVariant;

export type TypographyStyle = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight' | 'fontFamily'>;

export const headingFontFamily = Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto';
export const bodyFontFamily = Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto';

export const typography: Record<TextVariant, TypographyStyle> = {
  // Headings: descending sizes and weights (all with heading font)
  h1: { fontSize: 34, fontWeight: '700', lineHeight: 40, fontFamily: headingFontFamily },
  h2: { fontSize: 30, fontWeight: '600', lineHeight: 36, fontFamily: headingFontFamily },
  h3: { fontSize: 26, fontWeight: '600', lineHeight: 32, fontFamily: headingFontFamily },
  h4: { fontSize: 22, fontWeight: '600', lineHeight: 28, fontFamily: headingFontFamily },
  h5: { fontSize: 20, fontWeight: '600', lineHeight: 26, fontFamily: headingFontFamily },
  h6: { fontSize: 18, fontWeight: '600', lineHeight: 24, fontFamily: headingFontFamily },
  h7: { fontSize: 16, fontWeight: '600', lineHeight: 22, fontFamily: headingFontFamily },
  h8: { fontSize: 14, fontWeight: '600', lineHeight: 20, fontFamily: headingFontFamily },

  // Paragraphs: body text scale (all with body font)
  p1: { fontSize: 16, fontWeight: '500', lineHeight: 24, fontFamily: bodyFontFamily },
  p2: { fontSize: 16, fontWeight: '400', lineHeight: 22, fontFamily: bodyFontFamily },
  p3: { fontSize: 14, fontWeight: '400', lineHeight: 20, fontFamily: bodyFontFamily },
  p4: { fontSize: 13, fontWeight: '400', lineHeight: 18, fontFamily: bodyFontFamily },
  p5: { fontSize: 12, fontWeight: '400', lineHeight: 16, fontFamily: bodyFontFamily },
  p6: { fontSize: 11, fontWeight: '400', lineHeight: 14, fontFamily: bodyFontFamily },
  p7: { fontSize: 10, fontWeight: '400', lineHeight: 12, fontFamily: bodyFontFamily },
  p8: { fontSize: 9, fontWeight: '400', lineHeight: 11, fontFamily: bodyFontFamily },
};

export const getTypographyStyle = (variant: TextVariant): TypographyStyle => {
  return typography[variant];
};

export type IconSizeVariant =
  | 'tabBarIcons'
  | 'tabBarIconsIOS'
  | 'settingsIcons'
  | 'listIcons'
  | 'modalIcons'
  | 'smallIcons'
  | 'extraSmallIcons'
  | 'navigationChevrons';

export const iconSizes: Record<IconSizeVariant, number> = {
  // Tab bar icons (bottom navigation)
  tabBarIcons: 26,
  // Tab bar icons for iOS FallbackTabBar
  tabBarIconsIOS: 30,
  // Main settings/profile icons
  settingsIcons: 24,
  // List chevrons and navigation indicators
  listIcons: 20,
  // Modal buttons, checkmarks, appearance mode icons
  modalIcons: 18,
  // Small decorative icons
  smallIcons: 16,
  // Extra small decorative icons
  extraSmallIcons: 14,
  // Navigation icons
  navigationChevrons: 16,
};

export const getIconSize = (variant: IconSizeVariant): number => {
  return iconSizes[variant];
};



