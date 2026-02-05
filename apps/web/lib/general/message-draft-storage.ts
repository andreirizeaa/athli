const STORAGE_KEY = 'message_drafts';

export interface PdfDraft {
  name: string;
  data: string; // base64 encoded
  type: string;
  size: number;
}

export interface ImageDraft {
  name: string;
  data: string; // base64 encoded
  type: string;
  size: number;
}

export interface VideoDraft {
  name: string;
  data: string; // base64 encoded
  type: string;
  size: number;
}

export interface MessageDraftData {
  text: string;
  // Note: We no longer persist file attachments in localStorage due to quota limits
  // These fields are kept for backward compatibility but won't be saved
  pdf?: PdfDraft;
  images?: ImageDraft[];
  video?: VideoDraft;
}

export interface MessageDraft {
  contactId: string;
  text: string;
  timestamp: number;
}

// Simple text-only draft storage to avoid localStorage quota issues
interface TextOnlyDraft {
  text: string;
  timestamp: number;
}

export const messageDraftStorage = {
  /**
   * Get all message drafts from localStorage
   */
  getAllDrafts(): Record<string, MessageDraftData> {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return {};
      const parsed = JSON.parse(stored);
      // Convert text-only drafts to MessageDraftData format
      const result: Record<string, MessageDraftData> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'object' && value !== null) {
          const draft = value as TextOnlyDraft | MessageDraftData;
          result[key] = { text: draft.text || '' };
        }
      }
      return result;
    } catch {
      return {};
    }
  },

  /**
   * Get a draft for a specific contact
   */
  getDraft(contactId: string): MessageDraftData {
    if (typeof window === 'undefined') {
      return { text: '' };
    }

    try {
      const drafts = this.getAllDrafts();
      return drafts[contactId] || { text: '' };
    } catch {
      return { text: '' };
    }
  },

  /**
   * Get draft text only (for backward compatibility)
   */
  getDraftText(contactId: string): string {
    const draft = this.getDraft(contactId);
    return draft.text || '';
  },

  /**
   * Save a draft for a specific contact
   * Note: Only text is persisted. File attachments are not saved due to localStorage quota limits.
   */
  saveDraft(
    contactId: string,
    text: string,
    _pdf?: File | null,
    _images?: File[],
    _video?: File | null,
    _onPdfSaved?: () => void,
    _onImagesSaved?: () => void,
    _onVideoSaved?: () => void
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Only save text - files are too large for localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      const drafts: Record<string, TextOnlyDraft> = stored ? JSON.parse(stored) : {};

      // Only save if text has more than 1 character
      if (text.trim().length > 1) {
        drafts[contactId] = {
          text: text,
          timestamp: Date.now(),
        };
      } else {
        // Remove draft if text is too short
        delete drafts[contactId];
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
      // Handle quota exceeded error gracefully
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Try to clear old drafts and save again
        try {
          localStorage.removeItem(STORAGE_KEY);
          const newDrafts: Record<string, TextOnlyDraft> = {};
          if (text.trim().length > 1) {
            newDrafts[contactId] = {
              text: text,
              timestamp: Date.now(),
            };
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newDrafts));
        } catch {
          // If still failing, silently ignore
        }
      }
      // Silently ignore other storage errors
    }
  },

  /**
   * Remove a draft for a specific contact
   */
  removeDraft(contactId: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const drafts = JSON.parse(stored);
      delete drafts[contactId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Clear all drafts
   */
  clearAllDrafts(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Convert base64 PDF data back to File object
   * @deprecated File attachments are no longer persisted
   */
  pdfDataToFile(pdfData: PdfDraft): File {
    const byteString = atob(pdfData.data.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: pdfData.type });
    return new File([blob], pdfData.name, { type: pdfData.type });
  },

  /**
   * Convert base64 image data back to File object
   * @deprecated File attachments are no longer persisted
   */
  imageDataToFile(imageData: ImageDraft): File {
    const byteString = atob(imageData.data.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: imageData.type });
    return new File([blob], imageData.name, { type: imageData.type });
  },

  /**
   * Convert base64 video data back to File object
   * @deprecated File attachments are no longer persisted
   */
  videoDataToFile(videoData: VideoDraft): File {
    const byteString = atob(videoData.data.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: videoData.type });
    return new File([blob], videoData.name, { type: videoData.type });
  },
};
