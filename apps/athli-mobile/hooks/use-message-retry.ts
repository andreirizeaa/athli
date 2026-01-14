/**
 * Message Retry Hook
 * Handles retrying failed messages with optimistic UI updates
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message, OptimisticMessage } from '@/types/chat';

// ================================================
// TYPES
// ================================================

type RetryResult = {
  success: boolean;
  message?: Message;
  error?: Error;
};

type RetryOptions = {
  onRetryStart?: (messageId: string) => void;
  onRetrySuccess?: (message: Message) => void;
  onRetryFailed?: (messageId: string, error: Error) => void;
};

// ================================================
// MESSAGE RETRY HOOK
// ================================================

export const useMessageRetry = (options?: RetryOptions) => {
  const [retryingMessageIds, setRetryingMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  /**
   * Retry sending a failed message
   * Creates a new message record with the same content
   */
  const retryMessage = useCallback(
    async (
      failedMessage: Message | OptimisticMessage,
      conversationId: string,
      senderId: string,
    ): Promise<RetryResult> => {
      const messageId = failedMessage.id;

      // Mark as retrying
      setRetryingMessageIds((prev) => new Set(prev).add(messageId));
      setErrors((prev) => {
        const newErrors = new Map(prev);
        newErrors.delete(messageId);
        return newErrors;
      });

      options?.onRetryStart?.(messageId);

      try {
        // Insert new message with same content
        const { data: newMessage, error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: failedMessage.content,
            message_type: failedMessage.message_type,
            parent_message_id: failedMessage.parent_message_id || null,
            status: 'sent',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Transform to Message type
        const message: Message = {
          ...newMessage,
          sent_at: new Date(newMessage.sent_at),
          read_at: newMessage.read_at ? new Date(newMessage.read_at) : null,
          edited_at: newMessage.edited_at ? new Date(newMessage.edited_at) : null,
          deleted_at: newMessage.deleted_at
            ? new Date(newMessage.deleted_at)
            : null,
          created_at: new Date(newMessage.created_at),
        };

        // Remove from retrying set
        setRetryingMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });

        options?.onRetrySuccess?.(message);

        return { success: true, message };
      } catch (err) {
        const error = err as Error;
        console.error('[MessageRetry] Failed to retry message:', error);

        // Mark as failed again
        setRetryingMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });

        setErrors((prev) => {
          const newErrors = new Map(prev);
          newErrors.set(messageId, error);
          return newErrors;
        });

        options?.onRetryFailed?.(messageId, error);

        return { success: false, error };
      }
    },
    [options],
  );

  /**
   * Retry multiple failed messages in sequence
   */
  const retryMultipleMessages = useCallback(
    async (
      failedMessages: Array<Message | OptimisticMessage>,
      conversationId: string,
      senderId: string,
    ): Promise<RetryResult[]> => {
      const results: RetryResult[] = [];

      for (const message of failedMessages) {
        const result = await retryMessage(message, conversationId, senderId);
        results.push(result);

        // If one fails, stop retrying the rest
        if (!result.success) {
          break;
        }
      }

      return results;
    },
    [retryMessage],
  );

  /**
   * Check if a specific message is currently being retried
   */
  const isRetrying = useCallback(
    (messageId: string): boolean => {
      return retryingMessageIds.has(messageId);
    },
    [retryingMessageIds],
  );

  /**
   * Get error for a specific message
   */
  const getError = useCallback(
    (messageId: string): Error | undefined => {
      return errors.get(messageId);
    },
    [errors],
  );

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors(new Map());
  }, []);

  /**
   * Clear error for a specific message
   */
  const clearError = useCallback((messageId: string) => {
    setErrors((prev) => {
      const newErrors = new Map(prev);
      newErrors.delete(messageId);
      return newErrors;
    });
  }, []);

  return {
    retryMessage,
    retryMultipleMessages,
    isRetrying,
    getError,
    clearErrors,
    clearError,
    retryingMessageIds: Array.from(retryingMessageIds),
    hasRetrying: retryingMessageIds.size > 0,
  };
};

// ================================================
// FAILED MESSAGE DETECTOR
// ================================================

/**
 * Hook to detect and collect failed messages
 */
export const useFailedMessages = (messages: Array<Message | OptimisticMessage>) => {
  const failedMessages = messages.filter((msg) => msg.status === 'failed');

  const hasFailedMessages = failedMessages.length > 0;

  const failedMessageIds = failedMessages.map((msg) => msg.id);

  return {
    failedMessages,
    hasFailedMessages,
    failedMessageIds,
    failedCount: failedMessages.length,
  };
};

// ================================================
// AUTO-RETRY HOOK (OPTIONAL)
// ================================================

/**
 * Hook that automatically retries failed messages after a delay
 * Use with caution - may want to ask user first
 */
export const useAutoRetry = (
  messages: Array<Message | OptimisticMessage>,
  conversationId: string,
  senderId: string,
  options?: {
    enabled?: boolean;
    maxRetries?: number;
    retryDelay?: number; // milliseconds
  },
) => {
  const { enabled = false, maxRetries = 3, retryDelay = 5000 } = options || {};

  const [retryAttempts, setRetryAttempts] = useState<Map<string, number>>(
    new Map(),
  );

  const { retryMessage } = useMessageRetry();

  const attemptAutoRetry = useCallback(
    async (failedMessage: Message | OptimisticMessage) => {
      if (!enabled) return;

      const messageId = failedMessage.id;
      const currentAttempts = retryAttempts.get(messageId) || 0;

      if (currentAttempts >= maxRetries) {
        console.log('[AutoRetry] Max retries reached for message:', messageId);
        return;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      console.log(
        `[AutoRetry] Retrying message ${messageId} (attempt ${currentAttempts + 1}/${maxRetries})`,
      );

      const result = await retryMessage(failedMessage, conversationId, senderId);

      if (result.success) {
        // Clear retry attempts on success
        setRetryAttempts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(messageId);
          return newMap;
        });
      } else {
        // Increment retry attempts
        setRetryAttempts((prev) => {
          const newMap = new Map(prev);
          newMap.set(messageId, currentAttempts + 1);
          return newMap;
        });
      }
    },
    [enabled, retryAttempts, maxRetries, retryDelay, retryMessage, conversationId, senderId],
  );

  // Auto-retry failed messages
  const { failedMessages } = useFailedMessages(messages);

  // Trigger auto-retry for new failed messages
  useCallback(() => {
    if (!enabled) return;

    failedMessages.forEach((message) => {
      const attempts = retryAttempts.get(message.id) || 0;
      if (attempts < maxRetries) {
        attemptAutoRetry(message);
      }
    });
  }, [enabled, failedMessages, retryAttempts, maxRetries, attemptAutoRetry]);

  return {
    retryAttempts: Array.from(retryAttempts.entries()),
    clearRetryAttempts: () => setRetryAttempts(new Map()),
  };
};
