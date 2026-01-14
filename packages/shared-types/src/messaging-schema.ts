/**
 * Messaging Schema - Shared Types
 *
 * Core messaging types shared between mobile app, web frontend, and API.
 * These types match the database schema defined in migration 087.
 */

// ================================================
// ENUMS & LITERAL TYPES
// ================================================

export type MessageStatus = 'sending' | 'sent' | 'read' | 'failed';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';

export type ReactionEmoji = '👍' | '❤️' | '😂' | '😮' | '😢' | '🙏';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

// ================================================
// CORE INTERFACES (Database Schema)
// ================================================

/**
 * Message entity
 * Represents a single message in a conversation
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;

  // Content
  content: string | null;
  message_type: MessageType;

  // Threading
  parent_message_id: string | null;
  parent_message?: Message | null;

  // Status tracking
  status: MessageStatus;

  // Timestamps
  sent_at: Date;
  read_at: Date | null;
  edited_at: Date | null;

  // Soft delete
  is_deleted: boolean;
  deleted_at: Date | null;
  deleted_by_sender: boolean;
  deleted_by_recipient: boolean;

  created_at: Date;

  // Relations (populated via joins)
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
}

/**
 * Message attachment entity
 * Represents a file attached to a message
 */
export interface MessageAttachment {
  id: string;
  message_id: string;
  conversation_id: string;

  // Storage details
  bucket_id: string;
  file_path: string;
  filename: string;
  mime_type?: string;
  size_bytes?: number;

  // Media metadata
  thumbnail_path?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;

  // Upload tracking
  upload_status: UploadStatus;

  created_at: Date;

  // Local URI for displaying before upload completes
  local_uri?: string;
}

/**
 * Message reaction entity
 * Represents an emoji reaction to a message
 */
export interface MessageReaction {
  id: string;
  message_id: string;
  conversation_id: string;
  user_id: string;
  reaction: ReactionEmoji;
  created_at: Date;
}

/**
 * Conversation entity
 * Represents a 1-1 conversation between coach and client
 */
export interface Conversation {
  id: string;

  // Participants
  coach_id: string;
  client_id: string;

  // Denormalized for performance
  last_message_at: Date | null;
  last_message_preview: string | null;
  last_message_type: MessageType | null;

  created_at: Date;
  updated_at: Date;

  // Computed fields (added by service layer at runtime)
  other_user_id?: string;
  other_user_name?: string;
  other_user_avatar?: string | null;
  unread_count?: number;
}

/**
 * Conversation participant settings
 * Per-user settings for a conversation (archive, mute, pin)
 */
export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  other_user_id: string;

  // Per-user settings
  is_archived: boolean;
  is_muted: boolean;
  is_pinned: boolean;

  archived_at: Date | null;
  muted_at: Date | null;
  pinned_at: Date | null;

  updated_at: Date;
}

/**
 * Read receipt entity
 * Tracks which messages have been read by each user
 */
export interface ReadReceipt {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: Date;
  updated_at: Date;
}

// ================================================
// OPTIMISTIC UPDATES
// ================================================

/**
 * Optimistic message for UI updates before server confirmation
 * Used to show messages immediately while they're being sent
 */
export interface OptimisticMessage extends Partial<Message> {
  id: string; // Temporary ID: `temp-${timestamp}-${random}`
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  status: 'sending';
  sent_at: Date;
  is_deleted: false;

  // For optimistic attachments
  attachments?: Array<MessageAttachment & { local_uri: string }>;
}

// ================================================
// HELPER TYPES
// ================================================

/**
 * File path format for message attachments in storage
 * Format: {conversation_id}/{message_id}/{filename}
 */
export type AttachmentPathFormat = `${string}/${string}/${string}`;
