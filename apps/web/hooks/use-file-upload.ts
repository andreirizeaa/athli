/**
 * File Upload Hook for Message Attachments (Web App)
 * Handles uploading images, videos, and PDFs to Supabase Storage
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { STORAGE_BUCKET_NAME, getAttachmentPath } from '@athli/shared-types';

// ================================================
// TYPES
// ================================================

type UploadProgress = {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
};

type UploadResult = {
  attachmentId: string;
  publicUrl: string;
  filePath: string;
};

type UploadOptions = {
  conversationId: string;
  messageId: string;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
};

type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

// ================================================
// FILE UPLOAD HOOK
// ================================================

export const useFileUpload = () => {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('pending');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    bytesUploaded: 0,
    totalBytes: 0,
    percentage: 0,
  });
  const [error, setError] = useState<Error | null>(null);

  /**
   * Upload a file to Supabase Storage and create attachment record
   */
  const uploadFile = useCallback(
    async ({
      conversationId,
      messageId,
      file,
      onProgress,
    }: UploadOptions): Promise<UploadResult> => {
      setUploadStatus('uploading');
      setError(null);

      try {
        const supabase = createClient();

        // 1. Determine file extension and name
        const ext = file.name.split('.').pop() || 'bin';
        const finalFilename = file.name || `${Date.now()}.${ext}`;

        // 2. Generate storage path: {conversation_id}/{message_id}/{filename}
        const filePath = getAttachmentPath(conversationId, messageId, finalFilename);

        // 3. Update progress
        const initialProgress: UploadProgress = {
          bytesUploaded: 0,
          totalBytes: file.size,
          percentage: 0,
        };
        setUploadProgress(initialProgress);
        onProgress?.(initialProgress);

        // 4. Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // 5. Update progress to 100%
        const finalProgress: UploadProgress = {
          bytesUploaded: file.size,
          totalBytes: file.size,
          percentage: 100,
        };
        setUploadProgress(finalProgress);
        onProgress?.(finalProgress);

        // 6. Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .getPublicUrl(filePath);

        // 7. Generate thumbnail for images (optional)
        let thumbnailPath: string | undefined;
        let width: number | undefined;
        let height: number | undefined;

        if (file.type.startsWith('image/')) {
          const thumbnailResult = await generateImageThumbnail(file, conversationId, messageId);
          thumbnailPath = thumbnailResult?.path;
          width = thumbnailResult?.width;
          height = thumbnailResult?.height;
        }

        // 8. Create attachment record in database
        const { data: attachment, error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: messageId,
            conversation_id: conversationId,
            bucket_id: STORAGE_BUCKET_NAME,
            file_path: filePath,
            filename: finalFilename,
            mime_type: file.type,
            size_bytes: file.size,
            thumbnail_path: thumbnailPath,
            width,
            height,
            upload_status: 'completed',
          })
          .select()
          .single();

        if (attachmentError) throw attachmentError;

        setUploadStatus('completed');

        return {
          attachmentId: attachment.id,
          publicUrl: urlData.publicUrl,
          filePath,
        };
      } catch (err) {
        const error = err as Error;
        console.error('[FileUpload] Error uploading file:', error);
        setError(error);
        setUploadStatus('failed');
        throw error;
      }
    },
    []
  );

  /**
   * Upload multiple files (up to 4)
   */
  const uploadMultipleFiles = useCallback(
    async (
      conversationId: string,
      messageId: string,
      files: File[],
      onProgress?: (fileIndex: number, progress: UploadProgress) => void
    ): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const result = await uploadFile({
          conversationId,
          messageId,
          file: files[i],
          onProgress: (progress) => onProgress?.(i, progress),
        });
        results.push(result);
      }

      return results;
    },
    [uploadFile]
  );

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    setUploadStatus('pending');
    setUploadProgress({ bytesUploaded: 0, totalBytes: 0, percentage: 0 });
    setError(null);
  }, []);

  return {
    uploadFile,
    uploadMultipleFiles,
    uploadStatus,
    uploadProgress,
    error,
    isUploading: uploadStatus === 'uploading',
    isCompleted: uploadStatus === 'completed',
    isFailed: uploadStatus === 'failed',
    reset,
  };
};

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Generate a thumbnail for an image
 * Resizes to max 200x200 while maintaining aspect ratio
 */
const generateImageThumbnail = async (
  imageFile: File,
  conversationId: string,
  messageId: string
): Promise<{ path: string; width: number; height: number } | null> => {
  try {
    const supabase = createClient();

    // Create an image element to get dimensions
    const img = await createImageFromFile(imageFile);

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
      console.warn('[FileUpload] Failed to get canvas context');
      return null;
    }

    ctx.drawImage(img, 0, 0, THUMBNAIL_WIDTH, thumbnailHeight);

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
    });

    if (!blob) {
      console.warn('[FileUpload] Failed to create thumbnail blob');
      return null;
    }

    // Upload thumbnail
    const thumbnailFilename = `thumb_${Date.now()}.jpg`;
    const thumbnailPath = `${conversationId}/${messageId}/${thumbnailFilename}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .upload(thumbnailPath, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.warn('[FileUpload] Failed to upload thumbnail:', uploadError);
      return null;
    }

    return {
      path: thumbnailPath,
      width: THUMBNAIL_WIDTH,
      height: thumbnailHeight,
    };
  } catch (error) {
    console.warn('[FileUpload] Failed to generate thumbnail:', error);
    return null;
  }
};

/**
 * Create an Image element from a File object
 */
const createImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Convert base64 data URL to File object
 */
export const base64ToFile = (base64Data: string, filename: string): File => {
  // Extract mime type and base64 content
  const arr = base64Data.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
};
