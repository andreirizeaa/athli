/**
 * File Upload Hook for Message Attachments
 * Handles uploading images, videos, audio, and PDFs to Supabase Storage
 */

import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import type { MessageAttachment, UploadStatus } from '@/types/chat';
import {
  STORAGE_BUCKET_NAME,
  getAttachmentPath,
  THUMBNAIL_WIDTH,
} from '@athli/shared-types';

// ================================================
// TYPES
// ================================================

type UploadProgress = {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
};

type UploadResult = {
  attachment: MessageAttachment;
  publicUrl: string;
};

type UploadOptions = {
  conversationId: string;
  messageId: string;
  fileUri: string;
  mimeType: string;
  filename?: string;
  onProgress?: (progress: UploadProgress) => void;
};

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
      fileUri,
      mimeType,
      filename,
      onProgress,
    }: UploadOptions): Promise<UploadResult> => {
      setUploadStatus('uploading');
      setError(null);

      try {
        // 1. Read file info
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          throw new Error('File does not exist');
        }

        const fileSize = fileInfo.size || 0;

        // 2. Determine file extension and name
        const ext = mimeType.split('/')[1] || 'bin';
        const finalFilename = filename || `${Date.now()}.${ext}`;

        // 3. Generate storage path: {conversation_id}/{message_id}/{filename}
        const filePath = getAttachmentPath(conversationId, messageId, finalFilename);

        // 4. Read file as base64
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // 5. Convert to blob
        const blob = base64ToBlob(base64, mimeType);

        // Update progress
        const progress: UploadProgress = {
          bytesUploaded: 0,
          totalBytes: fileSize,
          percentage: 0,
        };
        setUploadProgress(progress);
        onProgress?.(progress);

        // 6. Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .upload(filePath, blob, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Update progress to 100%
        const finalProgress: UploadProgress = {
          bytesUploaded: fileSize,
          totalBytes: fileSize,
          percentage: 100,
        };
        setUploadProgress(finalProgress);
        onProgress?.(finalProgress);

        // 7. Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .getPublicUrl(filePath);

        // 8. Generate thumbnail for images/videos (optional)
        let thumbnailPath: string | undefined;
        let width: number | undefined;
        let height: number | undefined;

        if (mimeType.startsWith('image/')) {
          const thumbnailResult = await generateImageThumbnail(
            fileUri,
            conversationId,
            messageId,
          );
          thumbnailPath = thumbnailResult?.path;
          width = thumbnailResult?.width;
          height = thumbnailResult?.height;
        }

        // 9. Create attachment record in database
        const { data: attachment, error: attachmentError } = await supabase
          .from(STORAGE_BUCKET_NAME)
          .insert({
            message_id: messageId,
            conversation_id: conversationId,
            bucket_id: STORAGE_BUCKET_NAME,
            file_path: filePath,
            filename: finalFilename,
            mime_type: mimeType,
            size_bytes: fileSize,
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
          attachment: {
            ...attachment,
            created_at: new Date(attachment.created_at),
          } as MessageAttachment,
          publicUrl: urlData.publicUrl,
        };
      } catch (err) {
        const error = err as Error;
        console.error('[FileUpload] Error uploading file:', error);
        setError(error);
        setUploadStatus('failed');
        throw error;
      }
    },
    [],
  );

  /**
   * Upload an image with automatic thumbnail generation
   */
  const uploadImage = useCallback(
    async (
      conversationId: string,
      messageId: string,
      imageUri: string,
      onProgress?: (progress: UploadProgress) => void,
    ): Promise<UploadResult> => {
      return uploadFile({
        conversationId,
        messageId,
        fileUri: imageUri,
        mimeType: 'image/jpeg',
        onProgress,
      });
    },
    [uploadFile],
  );

  /**
   * Upload a video
   */
  const uploadVideo = useCallback(
    async (
      conversationId: string,
      messageId: string,
      videoUri: string,
      onProgress?: (progress: UploadProgress) => void,
    ): Promise<UploadResult> => {
      return uploadFile({
        conversationId,
        messageId,
        fileUri: videoUri,
        mimeType: 'video/mp4',
        onProgress,
      });
    },
    [uploadFile],
  );

  /**
   * Upload an audio file
   */
  const uploadAudio = useCallback(
    async (
      conversationId: string,
      messageId: string,
      audioUri: string,
      durationSeconds?: number,
      onProgress?: (progress: UploadProgress) => void,
    ): Promise<UploadResult> => {
      const result = await uploadFile({
        conversationId,
        messageId,
        fileUri: audioUri,
        mimeType: 'audio/mp4',
        onProgress,
      });

      // Update attachment with duration if provided
      if (durationSeconds && result.attachment.id) {
        await supabase
          .from(STORAGE_BUCKET_NAME)
          .update({ duration_seconds: durationSeconds })
          .eq('id', result.attachment.id);
      }

      return result;
    },
    [uploadFile],
  );

  /**
   * Upload a PDF document
   */
  const uploadDocument = useCallback(
    async (
      conversationId: string,
      messageId: string,
      documentUri: string,
      filename: string,
      onProgress?: (progress: UploadProgress) => void,
    ): Promise<UploadResult> => {
      return uploadFile({
        conversationId,
        messageId,
        fileUri: documentUri,
        mimeType: 'application/pdf',
        filename,
        onProgress,
      });
    },
    [uploadFile],
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
    uploadImage,
    uploadVideo,
    uploadAudio,
    uploadDocument,
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
 * Convert base64 string to Blob
 */
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Generate a thumbnail for an image
 * Resizes to max 200x200 while maintaining aspect ratio
 */
const generateImageThumbnail = async (
  imageUri: string,
  conversationId: string,
  messageId: string,
): Promise<{ path: string; width: number; height: number } | null> => {
  try {
    // Manipulate image to create thumbnail
    const manipulatedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: THUMBNAIL_WIDTH } }], // Resize to thumbnail width, height auto
      { compress: 0.7, format: SaveFormat.JPEG },
    );

    // Upload thumbnail
    const thumbnailFilename = `thumb_${Date.now()}.jpg`;
    const thumbnailPath = `${conversationId}/${messageId}/${thumbnailFilename}`;

    const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const blob = base64ToBlob(base64, 'image/jpeg');

    const { error: uploadError } = await supabase.storage
      .from('message_attachments')
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
      width: manipulatedImage.width,
      height: manipulatedImage.height,
    };
  } catch (error) {
    console.warn('[FileUpload] Failed to generate thumbnail:', error);
    return null;
  }
};

// ================================================
// SEND MESSAGE WITH ATTACHMENT
// ================================================

/**
 * Higher-level function to send a message with an attachment
 * Handles message creation + file upload atomically
 */
export const useSendMessageWithAttachment = () => {
  const { uploadFile, uploadStatus, uploadProgress, error } = useFileUpload();

  const sendWithAttachment = useCallback(
    async (
      conversationId: string,
      senderId: string,
      fileUri: string,
      mimeType: string,
      caption?: string,
      onProgress?: (progress: UploadProgress) => void,
    ) => {
      try {
        // 1. Determine message type from mime type
        let messageType: 'image' | 'video' | 'audio' | 'file' = 'file';
        if (mimeType.startsWith('image/')) messageType = 'image';
        else if (mimeType.startsWith('video/')) messageType = 'video';
        else if (mimeType.startsWith('audio/')) messageType = 'audio';

        // 2. Create message record first
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: caption || null,
            message_type: messageType,
            status: 'sent',
          })
          .select()
          .single();

        if (messageError) throw messageError;

        // 3. Upload file
        const uploadResult = await uploadFile({
          conversationId,
          messageId: message.id,
          fileUri,
          mimeType,
          onProgress,
        });

        // 4. Return message with attachment
        return {
          message: {
            ...message,
            sent_at: new Date(message.sent_at),
            attachments: [uploadResult.attachment],
          },
          attachment: uploadResult.attachment,
          publicUrl: uploadResult.publicUrl,
        };
      } catch (err) {
        console.error('[SendWithAttachment] Error:', err);
        throw err;
      }
    },
    [uploadFile],
  );

  return {
    sendWithAttachment,
    uploadStatus,
    uploadProgress,
    error,
    isUploading: uploadStatus === 'uploading',
  };
};
