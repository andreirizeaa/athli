/**
 * Converts a hex color to rgba with specified opacity.
 * @param hex - Hex color string (e.g., '#FF5733' or '#FF5733FF').
 * @param opacity - Opacity value between 0 and 1.
 * @returns rgba color string.
 */
export function hexToRgba(hex: string, opacity: number): string {
  const cleanHex = hex.replace('#', '');

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Tints a hex color towards white by a given amount.
 * @param hex - Hex color string (e.g. '#0D9488').
 * @param amount - Value between 0 and 1 (0 = original color, 1 = white).
 */
export function tintHex(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '');

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);

  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

/**
 * Gets the complementary (opposite) color on the color wheel.
 * @param hex - Hex color string (e.g., '#0D9488').
 * @returns Complementary hex color string.
 */
export function getComplementaryColor(hex: string): string {
  const cleanHex = hex.replace('#', '');

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Convert RGB to HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max === rNorm) {
      h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
    } else if (max === gNorm) {
      h = ((bNorm - rNorm) / d + 2) / 6;
    } else {
      h = ((rNorm - gNorm) / d + 4) / 6;
    }
  }

  // Add 180 degrees (0.5) to get complementary color
  h = (h + 0.5) % 1;

  // Convert HSL back to RGB
  let newR, newG, newB;
  if (s === 0) {
    newR = newG = newB = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    newR = hue2rgb(p, q, h + 1 / 3);
    newG = hue2rgb(p, q, h);
    newB = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (value: number) => Math.round(value * 255).toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Shades a hex color towards black by a given amount.
 * @param hex - Hex color string (e.g. '#0D9488').
 * @param amount - Value between 0 and 1 (0 = original color, 1 = black).
 */
export function shadeHex(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '');

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  const nr = Math.round(r * (1 - amount));
  const ng = Math.round(g * (1 - amount));
  const nb = Math.round(b * (1 - amount));

  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

/**
 * Calculates the relative luminance of a color (0 = black, 1 = white).
 * Uses the WCAG formula for relative luminance.
 * @param hex - Hex color string (e.g. '#0D9488').
 * @returns Luminance value between 0 and 1.
 */
export function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Convert to linear RGB
  const toLinear = (c: number) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Checks if a color is light (luminance > 0.5).
 * @param hex - Hex color string (e.g. '#0D9488').
 * @returns True if the color is light.
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.5;
}

/**
 * Mixes two hex colors by a given percentage.
 * @param color1 - The first hex color.
 * @param color2 - The second hex color.
 * @param percentage - The percentage of the second color to mix in (0-1).
 * @returns The mixed hex color.
 */
export function mixHex(color1: string, color2: string, percentage: number): string {
  const c1 = color1.replace('#', '');
  const c2 = color2.replace('#', '');

  const r1 = parseInt(c1.substring(0, 2), 16);
  const g1 = parseInt(c1.substring(2, 4), 16);
  const b1 = parseInt(c1.substring(4, 6), 16);

  const r2 = parseInt(c2.substring(0, 2), 16);
  const g2 = parseInt(c2.substring(2, 4), 16);
  const b2 = parseInt(c2.substring(4, 6), 16);

  const r = Math.round(r1 * (1 - percentage) + r2 * percentage);
  const g = Math.round(g1 * (1 - percentage) + g2 * percentage);
  const b = Math.round(b1 * (1 - percentage) + b2 * percentage);

  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}


