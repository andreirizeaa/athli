const STORAGE_KEY = 'message_drafts'

export interface PdfDraft {
  name: string
  data: string // base64 encoded
  type: string
  size: number
}

export interface ImageDraft {
  name: string
  data: string // base64 encoded
  type: string
  size: number
}

export interface VideoDraft {
  name: string
  data: string // base64 encoded
  type: string
  size: number
}

export interface MessageDraftData {
  text: string
  pdf?: PdfDraft
  images?: ImageDraft[]
  video?: VideoDraft
}

export interface MessageDraft {
  contactId: string
  text: string
  timestamp: number
}

export const messageDraftStorage = {
  /**
   * Get all message drafts from localStorage
   */
  getAllDrafts(): Record<string, MessageDraftData> {
    if (typeof window === 'undefined') {
      return {}
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return {}
      return JSON.parse(stored)
    } catch {
      return {}
    }
  },

  /**
   * Get a draft for a specific contact
   */
  getDraft(contactId: string): MessageDraftData {
    if (typeof window === 'undefined') {
      return { text: '' }
    }

    try {
      const drafts = this.getAllDrafts()
      return drafts[contactId] || { text: '' }
    } catch {
      return { text: '' }
    }
  },

  /**
   * Get draft text only (for backward compatibility)
   */
  getDraftText(contactId: string): string {
    const draft = this.getDraft(contactId)
    return draft.text || ''
  },

  /**
   * Save a draft for a specific contact
   */
  saveDraft(contactId: string, text: string, pdf?: File | null, images?: File[], video?: File | null, onPdfSaved?: () => void, onImagesSaved?: () => void, onVideoSaved?: () => void): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const drafts = this.getAllDrafts()
      // Only save if text has more than 1 character, or PDF/video/images are added
      const hasText = text.trim().length > 1
      const hasPdf = pdf !== null && pdf !== undefined && pdf instanceof File
      const hasVideo = video !== null && video !== undefined && video instanceof File
      const hasImages = images !== undefined && images !== null && images.length > 0

      // Check if there's an existing PDF, video, or images in the draft
      const existingDraft = drafts[contactId]
      const hasExistingPdf = existingDraft?.pdf !== undefined && existingDraft?.pdf !== null
      const hasExistingVideo = existingDraft?.video !== undefined && existingDraft?.video !== null
      const hasExistingImages = existingDraft?.images !== undefined && existingDraft?.images !== null && existingDraft.images.length > 0

      // Only create/update draft if:
      // 1. Text has more than 1 character, OR
      // 2. PDF is being added, OR
      // 3. Video is being added, OR
      // 4. Images are being added, OR
      // 5. Existing PDF/video/images exist (to preserve them)
      if (hasText || hasPdf || hasVideo || hasImages || hasExistingPdf || hasExistingVideo || hasExistingImages) {
        const draftData: MessageDraftData = { text: text || '' }

        if (hasPdf && pdf) {
          // Save text first (in case PDF reading fails or takes time)
          drafts[contactId] = draftData
          localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))

          // Convert file to base64 and update with PDF
          const reader = new FileReader()
          reader.onload = () => {
            try {
              const base64 = reader.result as string
              const updatedDraft: MessageDraftData = {
                text: text || '',
                pdf: {
                  name: pdf.name,
                  data: base64,
                  type: pdf.type,
                  size: pdf.size,
                },
              }
              drafts[contactId] = updatedDraft
              localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
              // Call callback to update state
              if (onPdfSaved) {
                onPdfSaved()
              }
            } catch {
              // If saving PDF fails, text is already saved
            }
          }
          reader.onerror = () => {
            // If reading fails, text is already saved
          }
          reader.readAsDataURL(pdf)
          return
        }

        // If PDF is explicitly null, remove it from draft
        // Only remove if we're explicitly clearing (pdf === null) and not just loading
        if (pdf === null && drafts[contactId]?.pdf && text.trim().length <= 1 && (!images || images.length === 0)) {
          delete drafts[contactId].pdf
        }

        // Preserve existing PDF if not explicitly removed
        if (hasExistingPdf && !hasPdf && pdf !== null) {
          draftData.pdf = existingDraft.pdf
        }

        // Handle video
        if (hasVideo && video) {
          // Save text and existing PDF first (in case video reading fails or takes time)
          drafts[contactId] = draftData
          localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))

          // Convert file to base64 and update with video
          const reader = new FileReader()
          reader.onload = () => {
            try {
              const base64 = reader.result as string
              const updatedDraft: MessageDraftData = {
                text: text || '',
                ...(draftData.pdf && { pdf: draftData.pdf }),
                video: {
                  name: video.name,
                  data: base64,
                  type: video.type,
                  size: video.size,
                },
              }
              drafts[contactId] = updatedDraft
              localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
              // Call callback to update state
              if (onVideoSaved) {
                onVideoSaved()
              }
            } catch {
              // If saving video fails, text is already saved
            }
          }
          reader.onerror = () => {
            // If reading fails, text is already saved
          }
          reader.readAsDataURL(video)
          return
        }

        // If video is explicitly null, remove it from draft
        // Only remove if we're explicitly clearing (video === null) and not just loading
        if (video === null && drafts[contactId]?.video && text.trim().length <= 1 && (!images || images.length === 0) && !hasPdf) {
          delete drafts[contactId].video
        }

        // Preserve existing video if not explicitly removed
        if (hasExistingVideo && !hasVideo && video !== null) {
          draftData.video = existingDraft.video
        }

        // Preserve existing images if not explicitly removed
        if (hasExistingImages && (!images || images.length === 0) && images !== undefined) {
          draftData.images = existingDraft.images
        }

        // Handle images
        if (hasImages && images && images.length > 0) {
          // Save text and existing PDF first
          drafts[contactId] = draftData
          localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))

          // Convert images to base64
          const convertImage = (file: File, index: number): Promise<ImageDraft> => {
            return new Promise((resolve) => {
              const reader = new FileReader()
              reader.onload = () => {
                const base64 = reader.result as string
                resolve({
                  name: file.name,
                  data: base64,
                  type: file.type,
                  size: file.size,
                })
              }
              reader.onerror = () => {
                resolve({
                  name: file.name,
                  data: '',
                  type: file.type,
                  size: file.size,
                })
              }
              reader.readAsDataURL(file)
            })
          }

          Promise.all(images.map(convertImage)).then((imageData) => {
            const updatedDraft: MessageDraftData = {
              text: text || '',
              ...(draftData.pdf && { pdf: draftData.pdf }),
              ...(draftData.video && { video: draftData.video }),
              images: imageData,
            }
            drafts[contactId] = updatedDraft
            localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
            // Call callback to update state
            if (onImagesSaved) {
              onImagesSaved()
            }
          })
          return
        }

        // If images is explicitly empty array, remove them from draft
        // Only remove if we're explicitly clearing (images.length === 0) and not just loading
        if (images !== undefined && images.length === 0 && existingDraft?.images && text.trim().length <= 1 && !hasPdf && !hasVideo) {
          delete draftData.images
        }

        // Preserve existing images if not explicitly removed
        if (hasExistingImages && (!images || images.length === 0) && images !== undefined) {
          draftData.images = existingDraft.images
        }

        // Only save if there's actual content:
        // - Text has more than 1 character, OR
        // - PDF is being added, OR
        // - Video is being added, OR
        // - Images are being added, OR
        // - Existing PDF/video/images exist (to preserve them when updating text)
        const hasActualContent = hasText || hasPdf || hasVideo || hasImages || hasExistingPdf || hasExistingVideo || hasExistingImages
        
        if (hasActualContent) {
          drafts[contactId] = draftData
        } else {
          // If no actual content, delete the draft
          delete drafts[contactId]
        }
      } else {
        delete drafts[contactId]
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Remove a draft for a specific contact
   */
  removeDraft(contactId: string): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const drafts = this.getAllDrafts()
      delete drafts[contactId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Clear all drafts
   */
  clearAllDrafts(): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Convert base64 PDF data back to File object
   */
  pdfDataToFile(pdfData: PdfDraft): File {
    const byteString = atob(pdfData.data.split(',')[1])
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: pdfData.type })
    return new File([blob], pdfData.name, { type: pdfData.type })
  },

  /**
   * Convert base64 image data back to File object
   */
  imageDataToFile(imageData: ImageDraft): File {
    const byteString = atob(imageData.data.split(',')[1])
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: imageData.type })
    return new File([blob], imageData.name, { type: imageData.type })
  },

  /**
   * Convert base64 video data back to File object
   */
  videoDataToFile(videoData: VideoDraft): File {
    const byteString = atob(videoData.data.split(',')[1])
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: videoData.type })
    return new File([blob], videoData.name, { type: videoData.type })
  },
}

