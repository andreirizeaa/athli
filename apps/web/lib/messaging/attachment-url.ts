/**
 * Attachment URL utilities
 * Handles generating signed URLs for message attachments in private storage buckets
 */

import { createClient } from '@/lib/supabase/client';
import { STORAGE_BUCKET_NAME } from '@athli/shared-types';

// Cache for signed URLs to avoid regenerating for the same file
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// URL cache expiry (45 minutes - signed URLs are valid for 1 hour)
const CACHE_EXPIRY_MS = 45 * 60 * 1000;

/**
 * Get a signed URL for an attachment
 * Uses caching to avoid regenerating URLs for the same file
 * 
 * @param bucketId - The storage bucket ID
 * @param filePath - The file path within the bucket
 * @returns Promise resolving to the signed URL, or null if generation fails
 */
export const getSignedAttachmentUrl = async (
  bucketId: string,
  filePath: string,
): Promise<string | null> => {
  const cacheKey = `${bucketId}:${filePath}`;
  const now = Date.now();
  
  // Check cache first
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }
  
  try {
    const supabase = createClient();
    
    // Generate signed URL valid for 1 hour (3600 seconds)
    const { data, error } = await supabase.storage
      .from(bucketId || STORAGE_BUCKET_NAME)
      .createSignedUrl(filePath, 3600);
    
    if (error || !data?.signedUrl) {
      console.error('[AttachmentUrl] Failed to generate signed URL:', error);
      return null;
    }
    
    // Cache the URL
    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + CACHE_EXPIRY_MS,
    });
    
    return data.signedUrl;
  } catch (error) {
    console.error('[AttachmentUrl] Error generating signed URL:', error);
    return null;
  }
};

/**
 * Clear expired entries from the URL cache
 * Can be called periodically to clean up memory
 */
export const cleanupSignedUrlCache = (): void => {
  const now = Date.now();
  for (const [key, value] of signedUrlCache.entries()) {
    if (value.expiresAt <= now) {
      signedUrlCache.delete(key);
    }
  }
};

/**
 * Clear all entries from the URL cache
 */
export const clearSignedUrlCache = (): void => {
  signedUrlCache.clear();
};

/**
 * Synchronously get a cached signed URL (no async call)
 * Returns null if not cached or expired
 *
 * @param bucketId - The storage bucket ID
 * @param filePath - The file path within the bucket
 * @returns The cached URL, or null if not in cache
 */
export const getCachedSignedUrl = (
  bucketId: string,
  filePath: string,
): string | null => {
  const cacheKey = `${bucketId}:${filePath}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  return null;
};

/**
 * Pre-fetch signed URLs for multiple attachments
 * Populates the cache so subsequent renders can access URLs synchronously
 *
 * @param attachments - Array of attachments with bucket_id and file_path
 */
export const prefetchAttachmentUrls = async (
  attachments: Array<{ bucket_id?: string; file_path?: string }>,
): Promise<void> => {
  await Promise.all(
    attachments
      .filter((a) => a.file_path)
      .map((a) => getSignedAttachmentUrl(a.bucket_id || STORAGE_BUCKET_NAME, a.file_path!)),
  );
};
