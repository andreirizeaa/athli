import * as FileSystem from 'expo-file-system';

/**
 * Generates a stable asset ID that works with iOS Limited Photos access.
 *
 * Under Limited Photos access, iOS often doesn't provide a native assetId.
 * This function generates a content-based fingerprint (MD5 hash) as a fallback
 * to ensure duplicate detection works reliably.
 *
 * @param asset - The asset object with optional assetId and required uri
 * @returns A stable identifier that can be used for duplicate detection
 */
export async function getStableAssetId(asset: {
  assetId?: string | null;
  uri: string;
}): Promise<string> {
  // Prefer native assetId (strip Photos suffix like /L0/001)
  if (asset.assetId && asset.assetId.trim()) {
    return asset.assetId.split('/')[0];
  }

  // Fallback: content hash of the file (stable across Limited permission)
  try {
    const info = (await FileSystem.getInfoAsync(asset.uri, { md5: true })) as any;
    if (info?.md5) {
      return `hash:${info.md5}`;
    }
  } catch (error) {
    // Log error for debugging but don't fail
    console.warn('Failed to generate MD5 hash for asset:', error);
  }

  // Last resort: deterministic but weaker identifier
  const base = asset.uri.split('/').pop() || asset.uri;
  return `uri:${base}`;
}
