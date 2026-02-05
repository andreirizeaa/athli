/**
 * Attachment Retry Queue
 * 
 * Manages failed attachment uploads and provides retry functionality.
 * Uses localStorage to persist failed uploads across page refreshes.
 */

import { STORAGE_BUCKET_NAME } from '@athli/shared-types';

// ================================================
// TYPES
// ================================================

export type FailedAttachment = {
  id: string;
  messageId: string;
  conversationId: string;
  filename: string;
  mimeType: string;
  size: number;
  data: string; // base64 data
  attachmentType: 'image' | 'video' | 'audio' | 'pdf';
  durationSeconds?: number;
  error: string;
  failedAt: Date;
  retryCount: number;
};

type RetryQueueState = {
  failedAttachments: FailedAttachment[];
};

// ================================================
// STORAGE
// ================================================

const STORAGE_KEY = 'athli_failed_attachments';
const MAX_RETRY_COUNT = 3;
const MAX_STORED_SIZE = 10 * 1024 * 1024; // 10MB max in localStorage

/**
 * Load failed attachments from localStorage
 */
const loadFromStorage = (): FailedAttachment[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored) as FailedAttachment[];
    return parsed.map((att) => ({
      ...att,
      failedAt: new Date(att.failedAt),
    }));
  } catch {
    return [];
  }
};

/**
 * Save failed attachments to localStorage
 */
const saveToStorage = (attachments: FailedAttachment[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Check total size before saving
    const json = JSON.stringify(attachments);
    if (json.length > MAX_STORED_SIZE) {
      console.warn('[RetryQueue] Data too large for localStorage, skipping oldest entries');
      // Remove oldest entries until we're under the limit
      const sorted = [...attachments].sort(
        (a, b) => new Date(a.failedAt).getTime() - new Date(b.failedAt).getTime()
      );
      while (sorted.length > 0 && JSON.stringify(sorted).length > MAX_STORED_SIZE) {
        sorted.shift();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    } else {
      localStorage.setItem(STORAGE_KEY, json);
    }
  } catch (error) {
    console.error('[RetryQueue] Failed to save to localStorage:', error);
  }
};

// ================================================
// QUEUE OPERATIONS
// ================================================

let failedAttachments: FailedAttachment[] = [];

// Initialize from storage on module load
if (typeof window !== 'undefined') {
  failedAttachments = loadFromStorage();
}

/**
 * Add a failed attachment to the retry queue
 */
export const addFailedAttachment = (
  attachment: Omit<FailedAttachment, 'id' | 'failedAt' | 'retryCount'>
): void => {
  const newEntry: FailedAttachment = {
    ...attachment,
    id: `failed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    failedAt: new Date(),
    retryCount: 0,
  };

  failedAttachments.push(newEntry);
  saveToStorage(failedAttachments);
};

/**
 * Get all failed attachments for a specific message
 */
export const getFailedAttachmentsForMessage = (messageId: string): FailedAttachment[] => {
  return failedAttachments.filter((att) => att.messageId === messageId);
};

/**
 * Get all failed attachments
 */
export const getAllFailedAttachments = (): FailedAttachment[] => {
  return [...failedAttachments];
};

/**
 * Remove a failed attachment from the queue (after successful retry)
 */
export const removeFailedAttachment = (id: string): void => {
  failedAttachments = failedAttachments.filter((att) => att.id !== id);
  saveToStorage(failedAttachments);
};

/**
 * Clear all failed attachments for a message
 */
export const clearFailedAttachmentsForMessage = (messageId: string): void => {
  failedAttachments = failedAttachments.filter((att) => att.messageId !== messageId);
  saveToStorage(failedAttachments);
};

/**
 * Increment retry count for an attachment
 */
export const incrementRetryCount = (id: string): number => {
  const attachment = failedAttachments.find((att) => att.id === id);
  if (attachment) {
    attachment.retryCount++;
    saveToStorage(failedAttachments);
    return attachment.retryCount;
  }
  return 0;
};

/**
 * Check if an attachment has exceeded max retries
 */
export const hasExceededMaxRetries = (id: string): boolean => {
  const attachment = failedAttachments.find((att) => att.id === id);
  return attachment ? attachment.retryCount >= MAX_RETRY_COUNT : true;
};

/**
 * Get count of failed attachments
 */
export const getFailedAttachmentCount = (): number => {
  return failedAttachments.length;
};

/**
 * Clear all failed attachments (e.g., on logout)
 */
export const clearAllFailedAttachments = (): void => {
  failedAttachments = [];
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
};

// ================================================
// RETRY LOGIC
// ================================================

type RetryResult = {
  success: boolean;
  error?: string;
};

/**
 * Retry uploading a failed attachment
 */
export const retryFailedAttachment = async (
  id: string,
  uploadFn: (attachment: FailedAttachment) => Promise<void>
): Promise<RetryResult> => {
  const attachment = failedAttachments.find((att) => att.id === id);
  if (!attachment) {
    return { success: false, error: 'Attachment not found in queue' };
  }

  if (hasExceededMaxRetries(id)) {
    return { success: false, error: 'Max retries exceeded' };
  }

  try {
    await uploadFn(attachment);
    removeFailedAttachment(id);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    incrementRetryCount(id);
    
    // Update error message
    attachment.error = errorMessage;
    saveToStorage(failedAttachments);
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Retry all failed attachments for a message
 */
export const retryAllForMessage = async (
  messageId: string,
  uploadFn: (attachment: FailedAttachment) => Promise<void>
): Promise<{ successCount: number; failedCount: number }> => {
  const toRetry = getFailedAttachmentsForMessage(messageId);
  let successCount = 0;
  let failedCount = 0;

  for (const attachment of toRetry) {
    const result = await retryFailedAttachment(attachment.id, uploadFn);
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  return { successCount, failedCount };
};
