/**
 * Messaging Constants - Shared Constants
 *
 * Runtime constants for messaging functionality shared across all apps.
 * These match the database constraints in migration 087.
 */

import type {
  MessageStatus,
  MessageType,
  ReactionEmoji,
  UploadStatus,
} from './messaging-schema';

// ================================================
// MESSAGE CONSTANTS
// ================================================

/**
 * All possible message statuses
 * sending → sent → read OR failed
 */
export const MESSAGE_STATUSES: readonly MessageStatus[] = [
  'sending',
  'sent',
  'read',
  'failed',
] as const;

/**
 * All possible message types
 */
export const MESSAGE_TYPES: readonly MessageType[] = [
  'text',
  'image',
  'video',
  'audio',
  'file',
] as const;

// ================================================
// REACTION CONSTANTS
// ================================================

/**
 * Predefined emoji reactions
 * Limited set for consistency across platforms
 */
export const REACTION_EMOJIS: readonly ReactionEmoji[] = [
  '👍',
  '❤️',
  '😂',
  '😮',
  '😢',
  '🙏',
] as const;

// ================================================
// ATTACHMENT CONSTANTS
// ================================================

/**
 * All possible upload statuses for attachments
 */
export const UPLOAD_STATUSES: readonly UploadStatus[] = [
  'pending',
  'uploading',
  'completed',
  'failed',
] as const;

/**
 * Supabase storage bucket name for message attachments
 */
export const STORAGE_BUCKET_NAME = 'message_attachments' as const;

/**
 * Path format template for message attachments in storage
 * Format: {conversation_id}/{message_id}/{filename}
 *
 * @example
 * "550e8400-e29b-41d4-a716-446655440000/123e4567-e89b-12d3-a456-426614174000/image.jpg"
 */
export const MESSAGE_ATTACHMENT_PATH_FORMAT =
  '{conversation_id}/{message_id}/{filename}' as const;

/**
 * Helper to generate attachment path
 *
 * @param conversationId - UUID of conversation
 * @param messageId - UUID of message
 * @param filename - Name of file
 * @returns Formatted path string
 *
 * @example
 * getAttachmentPath("conv-id", "msg-id", "photo.jpg")
 * // Returns: "conv-id/msg-id/photo.jpg"
 */
export function getAttachmentPath(
  conversationId: string,
  messageId: string,
  filename: string,
): string {
  return `${conversationId}/${messageId}/${filename}`;
}

// ================================================
// MIME TYPE CONSTANTS
// ================================================

/**
 * Supported image MIME types
 */
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/**
 * Supported video MIME types
 */
export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
] as const;

/**
 * Supported audio MIME types
 */
export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
] as const;

/**
 * Supported document MIME types
 */
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

/**
 * All supported MIME types for message attachments
 */
export const SUPPORTED_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...AUDIO_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
] as const;

/**
 * Helper to get message type from MIME type
 *
 * @param mimeType - MIME type string
 * @returns Corresponding message type
 *
 * @example
 * getMessageTypeFromMimeType("image/jpeg") // Returns: "image"
 * getMessageTypeFromMimeType("audio/mp3") // Returns: "audio"
 */
export function getMessageTypeFromMimeType(mimeType: string): MessageType {
  if (IMAGE_MIME_TYPES.includes(mimeType as any)) return 'image';
  if (VIDEO_MIME_TYPES.includes(mimeType as any)) return 'video';
  if (AUDIO_MIME_TYPES.includes(mimeType as any)) return 'audio';
  return 'file';
}

// ================================================
// VALIDATION CONSTANTS
// ================================================

/**
 * Maximum message content length (characters)
 */
export const MAX_MESSAGE_LENGTH = 10000;

/**
 * Maximum file size for attachments (bytes)
 * Default: 50MB
 */
export const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;

/**
 * Maximum number of attachments per message
 */
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

/**
 * Thumbnail width for image attachments (pixels)
 */
export const THUMBNAIL_WIDTH = 200;
