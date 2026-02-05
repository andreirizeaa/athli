/**
 * Upload Attachments Helper
 * Handles uploading message attachments to Supabase Storage
 * 
 * ATOMIC FLOW:
 * 1. Upload files to storage
 * 2. Create attachment records in database
 * 3. When all complete, trigger marks message as ready
 * 4. Database broadcasts the complete message
 */

import { createClient } from '@/lib/supabase/client';
import { STORAGE_BUCKET_NAME, getAttachmentPath } from '@athli/shared-types';
import { addFailedAttachment } from './attachment-retry-queue';

type AttachmentToUpload = {
  name: string;
  data: string; // base64 data URL
  type: string; // MIME type
  size: number;
  attachmentType: 'image' | 'video' | 'pdf' | 'audio';
  durationSeconds?: number; // For audio attachments
};

type UploadAttachmentsOptions = {
  conversationId: string;
  messageId: string;
  attachments: AttachmentToUpload[];
};

type UploadResult = {
  success: boolean;
  successCount: number;
  failedCount: number;
  errors: Array<{ name: string; error: string }>;
};

/**
 * Convert base64 data URL to Blob
 */
const base64ToBlob = (base64Data: string): Blob => {
  // Extract mime type and base64 content
  const arr = base64Data.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
};

/**
 * Generate a thumbnail for an image
 */
const generateImageThumbnail = async (
  blob: Blob,
  conversationId: string,
  messageId: string
): Promise<{ path: string; width: number; height: number } | null> => {
  try {
    const supabase = createClient();

    // Create an image element to get dimensions
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(blob);

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      image.src = url;
    });

    // Calculate thumbnail dimensions
    const THUMBNAIL_WIDTH = 200;
    const aspectRatio = img.height / img.width;
    const thumbnailHeight = Math.round(THUMBNAIL_WIDTH * aspectRatio);

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = thumbnailHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.warn('[UploadAttachments] Failed to get canvas context');
      return null;
    }

    ctx.drawImage(img, 0, 0, THUMBNAIL_WIDTH, thumbnailHeight);

    // Convert canvas to blob
    const thumbnailBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
    });

    if (!thumbnailBlob) {
      console.warn('[UploadAttachments] Failed to create thumbnail blob');
      return null;
    }

    // Upload thumbnail
    const thumbnailFilename = `thumb_${Date.now()}.jpg`;
    const thumbnailPath = `${conversationId}/${messageId}/${thumbnailFilename}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .upload(thumbnailPath, thumbnailBlob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.warn('[UploadAttachments] Failed to upload thumbnail:', uploadError);
      return null;
    }

    return {
      path: thumbnailPath,
      width: THUMBNAIL_WIDTH,
      height: thumbnailHeight,
    };
  } catch (error) {
    console.warn('[UploadAttachments] Failed to generate thumbnail:', error);
    return null;
  }
};

/**
 * Upload multiple attachments to Supabase Storage
 * 
 * Returns a result object with success/failure counts.
 * The database trigger will automatically mark the message as ready
 * when all expected attachments are uploaded.
 */
export const uploadAttachments = async ({
  conversationId,
  messageId,
  attachments,
}: UploadAttachmentsOptions): Promise<UploadResult> => {
  const supabase = createClient();
  const errors: Array<{ name: string; error: string }> = [];
  let successCount = 0;

  // Upload each attachment
  for (const attachment of attachments) {
    try {
      // 1. Convert base64 to blob
      const blob = base64ToBlob(attachment.data);

      // 2. Generate file path
      const filePath = getAttachmentPath(conversationId, messageId, attachment.name);

      // 3. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(filePath, blob, {
          contentType: attachment.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('[UploadAttachments] Failed to upload file:', uploadError);
        errors.push({ name: attachment.name, error: uploadError.message });
        continue; // Continue with other attachments
      }

      // 4. Generate thumbnail for images
      let thumbnailPath: string | undefined;
      let width: number | undefined;
      let height: number | undefined;

      if (attachment.type.startsWith('image/')) {
        const thumbnailResult = await generateImageThumbnail(blob, conversationId, messageId);
        thumbnailPath = thumbnailResult?.path;
        width = thumbnailResult?.width;
        height = thumbnailResult?.height;
      }

      // 5. Create attachment record in database
      // The database trigger will check if all attachments are complete
      // and mark the message as ready automatically
      const insertData = {
        message_id: messageId,
        conversation_id: conversationId,
        bucket_id: STORAGE_BUCKET_NAME,
        file_path: filePath,
        filename: attachment.name,
        mime_type: attachment.type,
        size_bytes: attachment.size,
        thumbnail_path: thumbnailPath,
        width,
        height,
        upload_status: 'completed',
        duration_seconds: attachment.durationSeconds,
      };

      const { error: attachmentError } = await supabase
        .from('message_attachments')
        .insert(insertData);

      if (attachmentError) {
        console.error('[UploadAttachments] Failed to create attachment record:', attachmentError);
        errors.push({ name: attachment.name, error: attachmentError.message });
        continue;
      }

      successCount++;
    } catch (error) {
      const err = error as any;
      const errorMessage = err?.message || 'Unknown error';
      console.error('[UploadAttachments] Failed to upload attachment:', attachment.name, err);
      errors.push({ name: attachment.name, error: errorMessage });

      // Add to retry queue for later
      addFailedAttachment({
        messageId,
        conversationId,
        filename: attachment.name,
        mimeType: attachment.type,
        size: attachment.size,
        data: attachment.data,
        attachmentType: attachment.attachmentType,
        durationSeconds: attachment.durationSeconds,
        error: errorMessage,
      });
    }
  }

  return {
    success: errors.length === 0,
    successCount,
    failedCount: errors.length,
    errors,
  };
};

/**
 * Retry failed attachment uploads
 * Can be called with the failed attachments from a previous upload attempt
 */
export const retryFailedAttachments = async ({
  conversationId,
  messageId,
  attachments,
}: UploadAttachmentsOptions): Promise<UploadResult> => {
  // Same as uploadAttachments, but can be extended with exponential backoff
  return uploadAttachments({ conversationId, messageId, attachments });
};
