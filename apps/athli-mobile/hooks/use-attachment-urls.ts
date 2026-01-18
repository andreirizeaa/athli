/**
 * Hook to manage signed URLs for message attachments
 * Handles async URL generation and caching for display in the message list
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { getSignedAttachmentUrl, getCachedSignedUrl } from '@/lib/attachment-url';
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
  // State for URLs (from cache or async generation)
  const [urlMap, setUrlMap] = useState<AttachmentUrlMap>({});

  // Track pending requests and mounted state
  const pendingRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Create a stable key for the attachments
  const attachmentIds = useMemo(() => {
    return attachments
      .filter((a) => a.file_path && !a.local_uri)
      .map((a) => a.id)
      .join(',');
  }, [attachments]);

  // Main effect: check cache and generate missing URLs
  useEffect(() => {
    if (!attachments || attachments.length === 0) return;

    const processAttachments = async () => {
      const newUrls: AttachmentUrlMap = {};
      const toGenerate: AttachmentWithLocalUri[] = [];

      // First pass: check cache and collect what needs generation
      for (const attachment of attachments) {
        // Skip if already has local_uri (optimistic message)
        if (attachment.local_uri) continue;

        // Skip if no file_path
        if (!attachment.file_path) continue;

        // Skip if already being fetched
        if (pendingRef.current.has(attachment.id)) continue;

        // Check global cache first
        const cachedUrl = getCachedSignedUrl(attachment.bucket_id, attachment.file_path);
        if (cachedUrl) {
          newUrls[attachment.id] = cachedUrl;
        } else {
          toGenerate.push(attachment);
        }
      }

      // If we found cached URLs, update state immediately
      if (Object.keys(newUrls).length > 0 && isMountedRef.current) {
        setUrlMap((prev) => {
          // Only update if there are new URLs not already in state
          const hasNewUrls = Object.keys(newUrls).some(
            (id) => prev[id] !== newUrls[id]
          );
          if (!hasNewUrls) return prev;
          return { ...prev, ...newUrls };
        });
      }

      // Generate URLs for attachments not in cache
      if (toGenerate.length === 0) return;

      console.log('[useAttachmentUrls] Generating URLs for', toGenerate.length, 'attachments');

      for (const attachment of toGenerate) {
        // Double-check it's not already being fetched
        if (pendingRef.current.has(attachment.id)) continue;

        pendingRef.current.add(attachment.id);

        try {
          const signedUrl = await getSignedAttachmentUrl(
            attachment.bucket_id,
            attachment.file_path,
          );

          if (signedUrl && isMountedRef.current) {
            // Update state with each URL as it's generated
            setUrlMap((prev) => ({ ...prev, [attachment.id]: signedUrl }));
          }
        } catch (error) {
          console.error('[useAttachmentUrls] Failed to get URL for:', attachment.id, error);
        } finally {
          pendingRef.current.delete(attachment.id);
        }
      }
    };

    processAttachments();
  }, [attachmentIds, attachments]);

  return urlMap;
};

/**
 * Get the display URL for an attachment
 * Prioritizes: local_uri (optimistic) > signed URL from map > empty string
 */
export const getAttachmentDisplayUrl = (
  attachment: AttachmentWithLocalUri,
  urlMap: AttachmentUrlMap,
): string => {
  // Optimistic messages use local_uri (blob URL)
  if (attachment.local_uri) {
    return attachment.local_uri;
  }

  // Use signed URL from map
  if (urlMap[attachment.id]) {
    return urlMap[attachment.id];
  }

  // Return empty - URL will be generated async
  return '';
};
