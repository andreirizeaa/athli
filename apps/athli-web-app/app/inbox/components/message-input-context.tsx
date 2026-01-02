'use client';

import React from 'react';
import type { Message } from '@/components/app/app-shell';
import { messageDraftStorage } from '@/lib/general/message-draft-storage';

interface MessageInputContextValue {
  // State
  messageInput: string;
  textareaHeight: number;
  attachedImages: File[];
  attachedPdf: File | null;
  attachedVideo: File | null;
  replyingToMessage: Message | null;

  // Actions
  setMessageInput: (value: string) => void;
  setTextareaHeight: (height: number) => void;
  addImages: (files: File[]) => void;
  removeImage: (index: number) => void;
  setPdf: (file: File | null) => void;
  removePdf: () => void;
  setVideo: (file: File | null) => void;
  removeVideo: () => void;
  setReplyingToMessage: (message: Message | null) => void;
  clearAll: () => void;
  sendMessage: () => void;

  // Utilities
  hasDraft: (contactId: string) => boolean;

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
    images?: Array<{ name: string; data: string; type: string; size: number }>;
    pdf?: { name: string; data: string; type: string; size: number };
    video?: { name: string; data: string; type: string; size: number };
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
  const [attachedImages, setAttachedImages] = React.useState<File[]>([]);
  const [attachedPdf, setAttachedPdf] = React.useState<File | null>(null);
  const [attachedVideo, setAttachedVideo] = React.useState<File | null>(null);
  const [replyingToMessage, setReplyingToMessage] = React.useState<Message | null>(null);

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
      setAttachedPdf(null);
      setAttachedVideo(null);
      setAttachedImages([]);
      setReplyingToMessage(null);
      setTextareaHeight(36);
      return;
    }

    const currentContactId = selectedContactId;
    isLoadingDraftRef.current = true;

    // Immediately clear files and text to prevent save effects from saving old data to new contact
    setMessageInput('');
    setAttachedPdf(null);
    setAttachedVideo(null);
    setAttachedImages([]);
    setReplyingToMessage(null);

    // Use a small delay to ensure state clears before loading draft
    setTimeout(() => {
      if (selectedContactId === currentContactId) {
        const draft = messageDraftStorage.getDraft(currentContactId);

        if (draft.text) {
          setMessageInput(draft.text);
        }

        // Restore PDF if it exists
        if (draft.pdf) {
          try {
            const pdfFile = messageDraftStorage.pdfDataToFile(draft.pdf);
            setAttachedPdf(pdfFile);
            setTextareaHeight(60);
          } catch {
            setAttachedPdf(null);
          }
        }

        // Restore video if it exists
        if (draft.video) {
          try {
            const videoFile = messageDraftStorage.videoDataToFile(draft.video);
            setAttachedVideo(videoFile);
            setTextareaHeight(60);
          } catch {
            setAttachedVideo(null);
          }
        }

        // Restore images if they exist
        if (draft.images && draft.images.length > 0) {
          try {
            const imageFiles = draft.images.map((img) => messageDraftStorage.imageDataToFile(img));
            setAttachedImages(imageFiles);
            setTextareaHeight(60);
          } catch {
            setAttachedImages([]);
          }
        }
      }

      // Reset flag after a delay to allow all state updates and effects to settle
      setTimeout(() => {
        isLoadingDraftRef.current = false;
      }, 300);
    }, 50);
  }, [selectedContactId]);

  // Save draft as user types (with debouncing for text)
  React.useEffect(() => {
    if (!selectedContactId || isLoadingDraftRef.current) return;

    const hasContent =
      messageInput.trim().length > 1 || attachedPdf || attachedVideo || attachedImages.length > 0;
    if (!hasContent) return;

    const timeoutId = setTimeout(() => {
      messageDraftStorage.saveDraft(
        selectedContactId,
        messageInput,
        attachedPdf,
        attachedImages,
        attachedVideo
      );
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [messageInput, selectedContactId, attachedPdf, attachedImages, attachedVideo]);

  // Save draft immediately when PDF changes
  React.useEffect(() => {
    if (!selectedContactId || isLoadingDraftRef.current) return;

    const currentContactId = selectedContactId;
    const currentPdf = attachedPdf;

    // Check if this PDF is from a draft (to avoid re-saving during load)
    const existingDraft = messageDraftStorage.getDraft(currentContactId);
    const isPdfFromDraft =
      existingDraft.pdf &&
      currentPdf &&
      existingDraft.pdf.name === currentPdf.name &&
      existingDraft.pdf.size === currentPdf.size;

    if (currentPdf && !isPdfFromDraft) {
      messageDraftStorage.saveDraft(
        currentContactId,
        messageInput,
        currentPdf,
        attachedImages,
        attachedVideo
      );
    } else if (
      currentPdf === null &&
      messageInput.trim().length <= 1 &&
      attachedImages.length === 0 &&
      !attachedVideo
    ) {
      messageDraftStorage.removeDraft(currentContactId);
    }
  }, [attachedPdf, selectedContactId, messageInput, attachedImages, attachedVideo]);

  // Save draft immediately when images change
  React.useEffect(() => {
    if (!selectedContactId || isLoadingDraftRef.current) return;

    const currentContactId = selectedContactId;
    const currentImages = attachedImages;

    // Check if these images are from a draft
    const existingDraft = messageDraftStorage.getDraft(currentContactId);
    const isImagesFromDraft =
      existingDraft.images &&
      existingDraft.images.length > 0 &&
      currentImages.length > 0 &&
      existingDraft.images.length === currentImages.length &&
      existingDraft.images.every(
        (draftImg, idx) =>
          currentImages[idx] &&
          draftImg.name === currentImages[idx].name &&
          draftImg.size === currentImages[idx].size
      );

    if (currentImages.length > 0 && !isImagesFromDraft) {
      messageDraftStorage.saveDraft(
        currentContactId,
        messageInput,
        attachedPdf,
        currentImages,
        attachedVideo
      );
    } else if (
      currentImages.length === 0 &&
      messageInput.trim().length <= 1 &&
      !attachedPdf &&
      !attachedVideo
    ) {
      messageDraftStorage.removeDraft(currentContactId);
    }
  }, [attachedImages, selectedContactId, messageInput, attachedPdf, attachedVideo]);

  // Save draft immediately when video changes
  React.useEffect(() => {
    if (!selectedContactId || isLoadingDraftRef.current) return;

    const currentContactId = selectedContactId;
    const currentVideo = attachedVideo;

    // Check if this video is from a draft
    const existingDraft = messageDraftStorage.getDraft(currentContactId);
    const isVideoFromDraft =
      existingDraft.video &&
      currentVideo &&
      existingDraft.video.name === currentVideo.name &&
      existingDraft.video.size === currentVideo.size;

    if (currentVideo && !isVideoFromDraft) {
      messageDraftStorage.saveDraft(
        currentContactId,
        messageInput,
        attachedPdf,
        attachedImages,
        currentVideo
      );
    } else if (
      currentVideo === null &&
      messageInput.trim().length <= 1 &&
      attachedImages.length === 0 &&
      !attachedPdf
    ) {
      messageDraftStorage.removeDraft(currentContactId);
    }
  }, [attachedVideo, selectedContactId, messageInput, attachedPdf, attachedImages]);

  // Stable actions using useCallback
  const addImages = React.useCallback((files: File[]) => {
    setAttachedImages((prev) => [...prev, ...files]);
    setTextareaHeight((h) => (h <= 36 ? 60 : h));
  }, []);

  const removeImage = React.useCallback((index: number) => {
    setAttachedImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Reset height if no attachments left
      if (updated.length === 0) {
        setAttachedPdf((pdf) => {
          setAttachedVideo((video) => {
            setReplyingToMessage((reply) => {
              if (!pdf && !video && !reply) {
                setTextareaHeight(36);
              }
              return reply;
            });
            return video;
          });
          return pdf;
        });
      }
      return updated;
    });
  }, []);

  const setPdf = React.useCallback((file: File | null) => {
    setAttachedPdf(file);
    if (file) {
      setTextareaHeight(60);
    }
  }, []);

  const removePdf = React.useCallback(() => {
    setAttachedPdf(null);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
    // Reset height if no other attachments
    setAttachedImages((images) => {
      setAttachedVideo((video) => {
        setReplyingToMessage((reply) => {
          if (images.length === 0 && !video && !reply) {
            setTextareaHeight(36);
          }
          return reply;
        });
        return video;
      });
      return images;
    });
  }, []);

  const setVideo = React.useCallback((file: File | null) => {
    setAttachedVideo(file);
    if (file) {
      setTextareaHeight(60);
    }
  }, []);

  const removeVideo = React.useCallback(() => {
    setAttachedVideo(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
    // Reset height if no other attachments
    setAttachedImages((images) => {
      setAttachedPdf((pdf) => {
        setReplyingToMessage((reply) => {
          if (images.length === 0 && !pdf && !reply) {
            setTextareaHeight(36);
          }
          return reply;
        });
        return pdf;
      });
      return images;
    });
  }, []);

  const clearAll = React.useCallback(() => {
    setMessageInput('');
    setReplyingToMessage(null);
    setAttachedPdf(null);
    setAttachedVideo(null);
    setAttachedImages([]);
    setTextareaHeight(36);

    // Clear draft from localStorage
    if (selectedContactId) {
      messageDraftStorage.removeDraft(selectedContactId);
    }
  }, [selectedContactId]);

  const sendMessage = React.useCallback(async () => {
    const hasContent = messageInput.trim() || attachedPdf || attachedVideo || attachedImages.length > 0;
    if (!hasContent || !selectedContactId) return;

    try {
      // Get draft data (already has base64 conversions)
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

      // Send text message
      if (messageInput.trim()) {
        await onSendMessage({
          text: messageInput.trim(),
          replyTo: replyToData,
        });
      }

      // Send images (use draft data if available for faster sending)
      for (let i = 0; i < attachedImages.length; i++) {
        const image = attachedImages[i];
        const draftImage = draft.images?.[i];

        // Use draft data if available and matches current file
        const data = draftImage &&
                     draftImage.name === image.name &&
                     draftImage.size === image.size &&
                     draftImage.data
          ? draftImage.data
          : await convertToBase64(image);

        await onSendMessage({
          text: '',
          images: [{
            name: image.name,
            data,
            type: image.type,
            size: image.size,
          }],
          replyTo: replyToData,
        });
      }

      // Send PDF (use draft data if available)
      if (attachedPdf) {
        const draftPdf = draft.pdf;
        const data = draftPdf &&
                     draftPdf.name === attachedPdf.name &&
                     draftPdf.size === attachedPdf.size &&
                     draftPdf.data
          ? draftPdf.data
          : await convertToBase64(attachedPdf);

        await onSendMessage({
          text: '',
          pdf: {
            name: attachedPdf.name,
            data,
            type: attachedPdf.type,
            size: attachedPdf.size,
          },
          replyTo: replyToData,
        });
      }

      // Send video (use draft data if available)
      if (attachedVideo) {
        const draftVideo = draft.video;
        const data = draftVideo &&
                     draftVideo.name === attachedVideo.name &&
                     draftVideo.size === attachedVideo.size &&
                     draftVideo.data
          ? draftVideo.data
          : await convertToBase64(attachedVideo);

        await onSendMessage({
          text: '',
          video: {
            name: attachedVideo.name,
            data,
            type: attachedVideo.type,
            size: attachedVideo.size,
          },
          replyTo: replyToData,
        });
      }

      // Clear all after sending
      clearAll();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [messageInput, attachedImages, attachedPdf, attachedVideo, replyingToMessage, selectedContactId, onSendMessage, clearAll]);

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

  const value = React.useMemo(
    () => ({
      messageInput,
      textareaHeight,
      attachedImages,
      attachedPdf,
      attachedVideo,
      replyingToMessage,
      setMessageInput,
      setTextareaHeight,
      addImages,
      removeImage,
      setPdf,
      removePdf,
      setVideo,
      removeVideo,
      setReplyingToMessage,
      clearAll,
      sendMessage,
      hasDraft,
      textareaRef,
      imageInputRef,
      pdfInputRef,
      videoInputRef,
    }),
    [
      messageInput,
      textareaHeight,
      attachedImages,
      attachedPdf,
      attachedVideo,
      replyingToMessage,
      addImages,
      removeImage,
      setPdf,
      removePdf,
      setVideo,
      removeVideo,
      clearAll,
      sendMessage,
      hasDraft,
    ]
  );

  return (
    <MessageInputContext.Provider value={value}>
      {children}
    </MessageInputContext.Provider>
  );
};
