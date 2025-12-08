/**
 * Converts a hex color to rgba with specified opacity
 * @param hex - Hex color string (e.g., '#FF5733' or '#FF5733FF')
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba color string
 */
export function hexToRgba(hex: string, opacity: number): string {
  // Remove the hash if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Tints a hex color towards white by a given amount.
 * @param hex - Hex color string (e.g. '#0D9488')
 * @param amount - Value between 0 and 1 (0 = original color, 1 = white)
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

