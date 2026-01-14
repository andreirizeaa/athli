'use client';

import React from 'react';
import { toast } from 'sonner';
import type { Message } from '@/components/app/app-shell';
import { messageDraftStorage } from '@/lib/general/message-draft-storage';

export type AttachmentType = 'image' | 'video' | 'pdf';

export interface Attachment {
  file: File;
  type: AttachmentType;
  preview?: string; // For images
}

interface MessageInputContextValue {
  // State
  messageInput: string;
  textareaHeight: number;
  attachments: Attachment[];
  replyingToMessage: Message | null;
  isRecordingVoiceNote: boolean;

  // Actions
  setMessageInput: (value: string) => void;
  setTextareaHeight: (height: number) => void;
  addAttachment: (file: File, type: AttachmentType) => void;
  addAttachments: (files: File[], type: AttachmentType) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  setReplyingToMessage: (message: Message | null) => void;
  setIsRecordingVoiceNote: (recording: boolean) => void;
  clearAll: () => void;
  sendMessage: () => void;
  sendVoiceNote: (blob: Blob, url: string, durationMs: number) => Promise<void>;

  // Utilities
  hasDraft: (contactId: string) => boolean;
  canAddMoreAttachments: boolean;

  // Refs
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  pdfInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
}

const MessageInputContext = React.createContext<MessageInputContextValue | null>(null);

export const useMessageInput = () => {
  const context = React.useContext(MessageInputContext);
  if (!context) {
    throw new Error('useMessageInput must be used within MessageInputProvider');
  }
  return context;
};

interface MessageInputProviderProps {
  children: React.ReactNode;
  selectedContactId: string | undefined;
  onSendMessage: (params: {
    text: string;
    attachments?: Array<{
      name: string;
      data: string;
      type: string;
      size: number;
      attachmentType: AttachmentType;
    }>;
    replyTo?: Message['replyTo'];
  }) => Promise<void>;
}

export const MessageInputProvider: React.FC<MessageInputProviderProps> = ({
  children,
  selectedContactId,
  onSendMessage,
}) => {
  // State
  const [messageInput, setMessageInput] = React.useState('');
  const [textareaHeight, setTextareaHeight] = React.useState(36);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [replyingToMessage, setReplyingToMessage] = React.useState<Message | null>(null);
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = React.useState(false);

  // Computed
  const canAddMoreAttachments = attachments.length < 4;

  // Refs
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const pdfInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const isLoadingDraftRef = React.useRef(false);

  // Load draft when contact changes
  React.useEffect(() => {
    if (!selectedContactId) {
      setMessageInput('');
      setAttachments([]);
      setReplyingToMessage(null);
      setTextareaHeight(36);
      return;
    }

    const currentContactId = selectedContactId;
    isLoadingDraftRef.current = true;

    // Immediately clear files and text to prevent save effects from saving old data to new contact
    setMessageInput('');
    setAttachments([]);
    setReplyingToMessage(null);

    // Use a small delay to ensure state clears before loading draft
    setTimeout(() => {
      if (selectedContactId === currentContactId) {
        const draft = messageDraftStorage.getDraft(currentContactId);

        if (draft.text) {
          setMessageInput(draft.text);
        }

        // Restore attachments from draft (convert old format)
        const restoredAttachments: Attachment[] = [];

        // Convert PDFs
        if (draft.pdf) {
          try {
            const pdfFile = messageDraftStorage.pdfDataToFile(draft.pdf);
            restoredAttachments.push({ file: pdfFile, type: 'pdf' });
          } catch (error) {
            console.error('Failed to restore PDF from draft:', error);
          }
        }

        // Convert videos
        if (draft.video) {
          try {
            const videoFile = messageDraftStorage.videoDataToFile(draft.video);
            restoredAttachments.push({ file: videoFile, type: 'video' });
          } catch (error) {
            console.error('Failed to restore video from draft:', error);
          }
        }

        // Convert images
        if (draft.images && draft.images.length > 0) {
          try {
            const imageFiles = draft.images.map((img) => messageDraftStorage.imageDataToFile(img));
            imageFiles.forEach((file) => {
              restoredAttachments.push({ file, type: 'image', preview: URL.createObjectURL(file) });
            });
          } catch (error) {
            console.error('Failed to restore images from draft:', error);
          }
        }

        if (restoredAttachments.length > 0) {
          setAttachments(restoredAttachments.slice(0, 4)); // Enforce 4-file limit
          setTextareaHeight(60);
        }
      }

      // Reset flag after a delay to allow all state updates and effects to settle
      setTimeout(() => {
        isLoadingDraftRef.current = false;
      }, 300);
    }, 50);
  }, [selectedContactId]);

  // Save draft as user types/updates attachments (with debouncing)
  React.useEffect(() => {
    if (!selectedContactId || isLoadingDraftRef.current) return;

    const hasContent = messageInput.trim().length > 1 || attachments.length > 0;

    const timeoutId = setTimeout(() => {
      if (hasContent) {
        // Convert attachments back to old format for draft storage
        const pdfAttachment = attachments.find((a) => a.type === 'pdf');
        const videoAttachment = attachments.find((a) => a.type === 'video');
        const imageAttachments = attachments.filter((a) => a.type === 'image');

        messageDraftStorage.saveDraft(
          selectedContactId,
          messageInput,
          pdfAttachment?.file || null,
          imageAttachments.map((a) => a.file),
          videoAttachment?.file || null
        );
      } else {
        messageDraftStorage.removeDraft(selectedContactId);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [messageInput, attachments, selectedContactId]);

  // Stable actions using useCallback
  const addAttachment = React.useCallback((file: File, type: AttachmentType) => {
    setAttachments((prev) => {
      if (prev.length >= 4) {
        toast.error('Maximum 4 files per message');
        return prev;
      }

      const attachment: Attachment = {
        file,
        type,
        preview: type === 'image' ? URL.createObjectURL(file) : undefined,
      };

      setTextareaHeight((h) => (h <= 36 ? 60 : h));
      return [...prev, attachment];
    });
  }, []);

  const addAttachments = React.useCallback((files: File[], type: AttachmentType) => {
    setAttachments((prev) => {
      const remainingSlots = 4 - prev.length;
      if (remainingSlots === 0) {
        toast.error('Maximum 4 files per message');
        return prev;
      }

      // Auto-take first N files based on remaining slots
      const filesToAdd = files.slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        toast.error(`Maximum 4 files per message. Only ${remainingSlots} file(s) added.`);
      }

      const newAttachments: Attachment[] = filesToAdd.map((file) => ({
        file,
        type,
        preview: type === 'image' ? URL.createObjectURL(file) : undefined,
      }));

      setTextareaHeight((h) => (h <= 36 ? 60 : h));
      return [...prev, ...newAttachments];
    });
  }, []);

  const removeAttachment = React.useCallback((index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      // Revoke preview URL if it's an image
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }

      const updated = prev.filter((_, i) => i !== index);

      // Reset height if no attachments left
      if (updated.length === 0) {
        setReplyingToMessage((reply) => {
          if (!reply) {
            setTextareaHeight(36);
          }
          return reply;
        });
      }

      return updated;
    });
  }, []);

  const clearAttachments = React.useCallback(() => {
    // Revoke all preview URLs
    setAttachments((prev) => {
      prev.forEach((att) => {
        if (att.preview) {
          URL.revokeObjectURL(att.preview);
        }
      });
      return [];
    });
  }, []);

  const clearAll = React.useCallback(() => {
    setMessageInput('');
    setReplyingToMessage(null);
    clearAttachments();
    setTextareaHeight(36);

    // Clear draft from localStorage
    if (selectedContactId) {
      messageDraftStorage.removeDraft(selectedContactId);
    }
  }, [selectedContactId, clearAttachments]);

  const sendMessage = React.useCallback(async () => {
    const hasContent = messageInput.trim() || attachments.length > 0;
    if (!hasContent || !selectedContactId) return;

    try {
      // Get draft data (already has base64 conversions for faster sending)
      const draft = messageDraftStorage.getDraft(selectedContactId);

      // Convert files to base64
      const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const replyToData = replyingToMessage
        ? {
            id: replyingToMessage.id,
            text: replyingToMessage.text,
            isSent: replyingToMessage.isSent,
            pdf: replyingToMessage.pdf,
            images: replyingToMessage.images,
            video: replyingToMessage.video,
          }
        : undefined;

      // Convert all attachments to API format
      const attachmentData = await Promise.all(
        attachments.map(async (att, index) => {
          // Try to use draft data if available for faster sending
          let data: string;

          if (att.type === 'image') {
            const draftImage = draft.images?.find(
              (img) => img.name === att.file.name && img.size === att.file.size
            );
            data = draftImage?.data || (await convertToBase64(att.file));
          } else if (att.type === 'pdf') {
            const draftPdf = draft.pdf;
            data =
              draftPdf?.name === att.file.name && draftPdf?.size === att.file.size && draftPdf?.data
                ? draftPdf.data
                : await convertToBase64(att.file);
          } else if (att.type === 'video') {
            const draftVideo = draft.video;
            data =
              draftVideo?.name === att.file.name &&
              draftVideo?.size === att.file.size &&
              draftVideo?.data
                ? draftVideo.data
                : await convertToBase64(att.file);
          } else {
            data = await convertToBase64(att.file);
          }

          return {
            name: att.file.name,
            data,
            type: att.file.type,
            size: att.file.size,
            attachmentType: att.type,
          };
        })
      );

      // Send single message with text and all attachments
      await onSendMessage({
        text: messageInput.trim(),
        attachments: attachmentData.length > 0 ? attachmentData : undefined,
        replyTo: replyToData,
      });

      // Clear all after sending
      clearAll();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  }, [messageInput, attachments, replyingToMessage, selectedContactId, onSendMessage, clearAll]);

  // Send voice note
  const sendVoiceNote = React.useCallback(async (blob: Blob, url: string, durationMs: number) => {
    if (!selectedContactId) return;

    try {
      // Convert blob to base64
      const convertToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      const data = await convertToBase64(blob);

      const replyToData = replyingToMessage
        ? {
            id: replyingToMessage.id,
            text: replyingToMessage.text,
            isSent: replyingToMessage.isSent,
            pdf: replyingToMessage.pdf,
            images: replyingToMessage.images,
            video: replyingToMessage.video,
          }
        : undefined;

      // Send voice note as video attachment (since we don't have a separate voice note type)
      await onSendMessage({
        text: '',
        attachments: [
          {
            name: `voice-note-${Date.now()}.webm`,
            data,
            type: blob.type,
            size: blob.size,
            attachmentType: 'video',
          },
        ],
        replyTo: replyToData,
      });

      // Clear state
      setIsRecordingVoiceNote(false);
      setReplyingToMessage(null);
    } catch (error) {
      console.error('Failed to send voice note:', error);
      setIsRecordingVoiceNote(false);
    }
  }, [selectedContactId, replyingToMessage, onSendMessage]);

  // Utility to check if a contact has a draft
  const hasDraft = React.useCallback((contactId: string): boolean => {
    const draft = messageDraftStorage.getDraft(contactId);
    return (
      Boolean(draft.text?.trim()) ||
      Boolean(draft.pdf) ||
      Boolean(draft.video) ||
      Boolean(draft.images && draft.images.length > 0)
    );
  }, []);

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      attachments.forEach((att) => {
        if (att.preview) {
          URL.revokeObjectURL(att.preview);
        }
      });
    };
  }, []);

  const value = React.useMemo(
    () => ({
      messageInput,
      textareaHeight,
      attachments,
      replyingToMessage,
      isRecordingVoiceNote,
      setMessageInput,
      setTextareaHeight,
      addAttachment,
      addAttachments,
      removeAttachment,
      clearAttachments,
      setReplyingToMessage,
      setIsRecordingVoiceNote,
      clearAll,
      sendMessage,
      sendVoiceNote,
      hasDraft,
      canAddMoreAttachments,
      textareaRef,
      imageInputRef,
      pdfInputRef,
      videoInputRef,
    }),
    [
      messageInput,
      textareaHeight,
      attachments,
      replyingToMessage,
      isRecordingVoiceNote,
      addAttachment,
      addAttachments,
      removeAttachment,
      clearAttachments,
      clearAll,
      sendMessage,
      sendVoiceNote,
      hasDraft,
      canAddMoreAttachments,
    ]
  );

  return (
    <MessageInputContext.Provider value={value}>
      {children}
    </MessageInputContext.Provider>
  );
};
