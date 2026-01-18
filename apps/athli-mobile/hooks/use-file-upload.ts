/**
 * File Upload Hook for Message Attachments
 * Handles uploading images, videos, audio, and PDFs to Supabase Storage
 */

import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
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
  filePath: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  thumbnailPath?: string;
  width?: number;
  height?: number;
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

        // Update progress
        const progress: UploadProgress = {
          bytesUploaded: 0,
          totalBytes: fileSize,
          percentage: 0,
        };
        setUploadProgress(progress);
        onProgress?.(progress);

        // 5. Upload to Supabase Storage using base64 decode
        // React Native doesn't support Blob from ArrayBuffer, so we use base64 upload
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .upload(filePath, decode(base64), {
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

        // 6. Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .getPublicUrl(filePath);

        // 7. Generate thumbnail for images/videos (optional)
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

        setUploadStatus('completed');

        // Return storage info without creating DB record yet
        // DB record will be created after message is created with real message_id
        return {
          filePath,
          filename: finalFilename,
          mimeType,
          fileSize,
          thumbnailPath,
          width,
          height,
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
   * Note: Duration should be stored when creating the attachment record after message creation
   */
  const uploadAudio = useCallback(
    async (
      conversationId: string,
      messageId: string,
      audioUri: string,
      durationSeconds?: number,
      onProgress?: (progress: UploadProgress) => void,
    ): Promise<UploadResult & { durationSeconds?: number }> => {
      const result = await uploadFile({
        conversationId,
        messageId,
        fileUri: audioUri,
        mimeType: 'audio/mp4',
        onProgress,
      });

      // Return duration with the result - caller should store it in attachment record
      return {
        ...result,
        durationSeconds,
      };
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

    const { error: uploadError } = await supabase.storage
      .from('message_attachments')
      .upload(thumbnailPath, decode(base64), {
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
      durationSeconds?: number, // For audio attachments
      onProgress?: (progress: UploadProgress) => void,
    ) => {
      // Generate a UUID for the storage path to satisfy file_path format constraint
      // Using expo-crypto for proper UUID format in React Native
      const tempId = Crypto.randomUUID();

      try {
        // 1. Determine message type from mime type
        let messageType: 'image' | 'video' | 'audio' | 'file' = 'file';
        if (mimeType.startsWith('image/')) messageType = 'image';
        else if (mimeType.startsWith('video/')) messageType = 'video';
        else if (mimeType.startsWith('audio/')) messageType = 'audio';

        // 2. Upload file to storage FIRST - if this fails, no message is created
        const uploadResult = await uploadFile({
          conversationId,
          messageId: tempId, // Just used for storage path organization
          fileUri,
          mimeType,
          onProgress,
        });

        // 3. Create message record AFTER successful upload
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: caption || null,
            message_type: messageType,
            status: 'sent',
            attachment_count: 1, // This message has 1 attachment
          })
          .select()
          .single();

        if (messageError) {
          console.error('[SendWithAttachment] Message creation failed after upload:', messageError);
          throw messageError;
        }

        // 4. Create attachment record with real message_id
        const { data: attachment, error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: message.id,
            conversation_id: conversationId,
            bucket_id: STORAGE_BUCKET_NAME,
            file_path: uploadResult.filePath,
            filename: uploadResult.filename,
            mime_type: uploadResult.mimeType,
            size_bytes: uploadResult.fileSize,
            thumbnail_path: uploadResult.thumbnailPath,
            width: uploadResult.width,
            height: uploadResult.height,
            upload_status: 'completed',
            duration_seconds: durationSeconds, // For audio attachments
          })
          .select()
          .single();

        if (attachmentError) {
          console.error('[SendWithAttachment] Attachment record creation failed:', attachmentError);
          // Message was created but attachment record failed - delete the message
          await supabase.from('messages').delete().eq('id', message.id);
          throw attachmentError;
        }

        // 5. Return message with attachment
        return {
          message: {
            ...message,
            sent_at: new Date(message.sent_at),
            attachments: [attachment],
          },
          attachment: {
            ...attachment,
            created_at: new Date(attachment.created_at),
          } as MessageAttachment,
          publicUrl: uploadResult.publicUrl,
        };
      } catch (err) {
        console.error('[SendWithAttachment] Error:', err);
        throw err;
      }
    },
    [uploadFile],
  );

  /**
   * Send a message with multiple attachments (e.g., multiple images)
   * All attachments belong to a single message
   */
  const sendWithMultipleAttachments = useCallback(
    async (
      conversationId: string,
      senderId: string,
      files: Array<{ uri: string; mimeType: string }>,
      caption?: string,
      onProgress?: (progress: { current: number; total: number }) => void,
    ) => {
      if (files.length === 0) {
        throw new Error('No files provided');
      }

      // Generate temp IDs for storage paths
      const tempIds = files.map(() => Crypto.randomUUID());

      try {
        // 1. Determine message type from first file's mime type
        const firstMimeType = files[0].mimeType;
        let messageType: 'image' | 'video' | 'audio' | 'file' = 'file';
        if (firstMimeType.startsWith('image/')) messageType = 'image';
        else if (firstMimeType.startsWith('video/')) messageType = 'video';
        else if (firstMimeType.startsWith('audio/')) messageType = 'audio';

        // 2. Upload ALL files in parallel for speed
        const uploadPromises = files.map((file, index) =>
          uploadFile({
            conversationId,
            messageId: tempIds[index],
            fileUri: file.uri,
            mimeType: file.mimeType,
            onProgress: (p) => {
              onProgress?.({ current: index + 1, total: files.length });
            },
          })
        );

        const uploadResults = await Promise.all(uploadPromises);

        // 3. Create ONE message record with attachment_count
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: caption || null,
            message_type: messageType,
            status: 'sent',
            attachment_count: files.length,
          })
          .select()
          .single();

        if (messageError) {
          console.error('[SendWithMultipleAttachments] Message creation failed:', messageError);
          throw messageError;
        }

        // 4. Create attachment records for ALL files
        const attachmentInserts = uploadResults.map((result) => ({
          message_id: message.id,
          conversation_id: conversationId,
          bucket_id: STORAGE_BUCKET_NAME,
          file_path: result.filePath,
          filename: result.filename,
          mime_type: result.mimeType,
          size_bytes: result.fileSize,
          thumbnail_path: result.thumbnailPath,
          width: result.width,
          height: result.height,
          upload_status: 'completed',
        }));

        const { data: attachments, error: attachmentsError } = await supabase
          .from('message_attachments')
          .insert(attachmentInserts)
          .select();

        if (attachmentsError) {
          console.error('[SendWithMultipleAttachments] Attachments creation failed:', attachmentsError);
          // Cleanup: delete the message if attachments fail
          await supabase.from('messages').delete().eq('id', message.id);
          throw attachmentsError;
        }

        // 5. Return message with all attachments
        return {
          message: {
            ...message,
            sent_at: new Date(message.sent_at),
            attachments: attachments?.map((a: any) => ({
              ...a,
              created_at: new Date(a.created_at),
            })),
          },
          attachments: attachments?.map((a: any) => ({
            ...a,
            created_at: new Date(a.created_at),
          })) as MessageAttachment[],
        };
      } catch (err) {
        console.error('[SendWithMultipleAttachments] Error:', err);
        throw err;
      }
    },
    [uploadFile],
  );

  return {
    sendWithAttachment,
    sendWithMultipleAttachments,
    uploadStatus,
    uploadProgress,
    error,
    isUploading: uploadStatus === 'uploading',
  };
};
