/**
 * Hook to manage signed URLs for message attachments
 * Handles async URL generation and caching for display in the message list
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { getSignedAttachmentUrl, getCachedSignedUrl } from '@/lib/messaging/attachment-url';
import { STORAGE_BUCKET_NAME } from '@athli/shared-types';
import type { MessageAttachment } from '@athli/shared-types';

type AttachmentWithLocalUri = MessageAttachment & { local_uri?: string };

interface AttachmentUrlMap {
  [attachmentId: string]: string;
}

/**
 * Hook to generate and cache signed URLs for message attachments
 *
 * @param attachments - Array of attachments from messages
 * @returns Object mapping attachment IDs to their signed URLs
 */
export const useAttachmentUrls = (
  attachments: AttachmentWithLocalUri[],
): AttachmentUrlMap => {
  // State for async-fetched URLs
  const [asyncUrlMap, setAsyncUrlMap] = useState<AttachmentUrlMap>({});

  // Synchronously check cache on every render for immediate display
  // This runs on every render but is fast (just Map lookups)
  const cachedUrls = useMemo(() => {
    const cached: AttachmentUrlMap = {};
    attachments.forEach((att) => {
      if (att.local_uri || !att.file_path) return;
      const url = getCachedSignedUrl(att.bucket_id || STORAGE_BUCKET_NAME, att.file_path);
      if (url) {
        cached[att.id] = url;
      }
    });
    return cached;
  }, [attachments]);

  // Merge cached URLs with async-fetched URLs (cached takes precedence for freshness)
  const urlMap = useMemo(() => ({
    ...asyncUrlMap,
    ...cachedUrls,
  }), [asyncUrlMap, cachedUrls]);

  // Use refs to track state without causing re-renders
  const asyncUrlMapRef = useRef<AttachmentUrlMap>({});
  const pendingRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  const attachmentsRef = useRef<AttachmentWithLocalUri[]>([]);

  // Keep refs in sync
  attachmentsRef.current = attachments;

  useEffect(() => {
    asyncUrlMapRef.current = asyncUrlMap;
  }, [asyncUrlMap]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Create a stable key for the attachments to avoid unnecessary effect runs
  // Only re-run when attachment IDs actually change
  const attachmentIds = attachments
    .filter((a) => a.file_path && !a.local_uri)
    .map((a) => a.id)
    .join(',');

  useEffect(() => {
    const currentAttachments = attachmentsRef.current;
    if (!currentAttachments || currentAttachments.length === 0) return;

    // Filter to only attachments that need URLs generated
    const attachmentsNeedingUrls = currentAttachments.filter((attachment) => {
      // Skip if already has local_uri (optimistic message)
      if (attachment.local_uri) return false;

      // Skip if already in async urlMap (use ref to avoid dependency)
      if (asyncUrlMapRef.current[attachment.id]) return false;

      // Skip if already being fetched
      if (pendingRef.current.has(attachment.id)) return false;

      // Skip if no file_path
      if (!attachment.file_path) return false;

      // Skip if already in cache (will be picked up by useMemo)
      if (getCachedSignedUrl(attachment.bucket_id || STORAGE_BUCKET_NAME, attachment.file_path)) return false;

      return true;
    });

    if (attachmentsNeedingUrls.length === 0) return;

    const generateUrls = async () => {
      const newUrls: AttachmentUrlMap = {};

      for (const attachment of attachmentsNeedingUrls) {
        // Double-check it's not already processed (race condition protection)
        if (asyncUrlMapRef.current[attachment.id] || pendingRef.current.has(attachment.id)) {
          continue;
        }

        // Mark as pending
        pendingRef.current.add(attachment.id);

        try {
          const signedUrl = await getSignedAttachmentUrl(
            attachment.bucket_id || STORAGE_BUCKET_NAME,
            attachment.file_path,
          );

          if (signedUrl && isMountedRef.current) {
            newUrls[attachment.id] = signedUrl;
            // Update ref immediately so other iterations know it's done
            asyncUrlMapRef.current[attachment.id] = signedUrl;
          }
        } catch (error) {
          console.error('[useAttachmentUrls] Failed to get URL for:', attachment.id, error);
        } finally {
          pendingRef.current.delete(attachment.id);
        }
      }

      // Batch update state once at the end
      if (Object.keys(newUrls).length > 0 && isMountedRef.current) {
        setAsyncUrlMap((prev) => ({ ...prev, ...newUrls }));
      }
    };

    generateUrls();
  }, [attachmentIds]); // Only re-run when attachment IDs change

  return urlMap;
};

/**
 * Get the display URL for an attachment
 * Prioritizes: local_uri (optimistic) > signed URL from map > fallback
 */
export const getAttachmentDisplayUrl = (
  attachment: AttachmentWithLocalUri,
  urlMap: AttachmentUrlMap,
  fallbackUrl?: string,
): string => {
  // Optimistic messages use local_uri (blob URL)
  if (attachment.local_uri) {
    return attachment.local_uri;
  }

  // Use signed URL from map
  if (urlMap[attachment.id]) {
    return urlMap[attachment.id];
  }

  // Fallback (shouldn't be needed but just in case)
  return fallbackUrl || '';
};
