/**
 * Chat and messaging types
 * Re-exports from @athli/shared-types for mobile app
 */

// Re-export all messaging types from shared package
export type {
  // Core types
  MessageStatus,
  MessageType,
  ReactionEmoji,
  UploadStatus,

  // Interfaces
  Message,
  MessageAttachment,
  MessageReaction,
  Conversation,
  ConversationParticipant,
  ReadReceipt,
  OptimisticMessage,
} from '@athli/shared-types';