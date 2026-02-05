/**
 * Check if a file path is an external link (http:// or https://)
 */
export const isExternalLink = (filePath: string | null | undefined): boolean => {
  if (!filePath) return false;
  return filePath.startsWith('http://') || filePath.startsWith('https://');
};
