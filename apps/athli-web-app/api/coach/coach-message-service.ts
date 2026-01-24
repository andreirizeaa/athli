export interface MessageFile {
  name: string;
  data: string; // base64 encoded
  type: string;
  size: number;
}

export type AttachmentType = 'image' | 'video' | 'pdf' | 'audio';

export interface MessageAttachment {
  name: string;
  data: string; // base64 encoded
  type: string;
  size: number;
  attachmentType: AttachmentType;
}

export interface RepliedToMessage {
  id: string;
  text: string;
  isSent: boolean;
  pdf?: MessageFile;
  images?: MessageFile[];
  video?: MessageFile;
}

export interface SendMessageData {
  contactId: string;
  text?: string;
  // New unified attachments array
  attachments?: MessageAttachment[];
  // Legacy fields (for backward compatibility)
  pdf?: MessageFile;
  images?: MessageFile[];
  video?: MessageFile;
  repliedTo?: RepliedToMessage;
}

export interface DeleteMessageData {
  contactId: string;
  messageId: string;
}

export interface BroadcastMessageData {
  clientIds: string[];
  text?: string;
  pdf?: MessageFile;
  images?: MessageFile[];
  video?: MessageFile;
}

/**
 * Service method to send a message to a client
 * This will be connected to the backend in the future
 */
export const sendMessage = async (data: SendMessageData): Promise<void> => {
  // TODO: Connect to backend API
  console.log('Sending message:', {
    contactId: data.contactId,
    text: data.text || '(no text)',
    hasPdf: !!data.pdf,
    pdfName: data.pdf?.name,
    hasImages: !!data.images && data.images.length > 0,
    imageCount: data.images?.length || 0,
    hasVideo: !!data.video,
    videoName: data.video?.name,
    hasReply: !!data.repliedTo,
    repliedToId: data.repliedTo?.id,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Service method to delete a message
 * This will be connected to the backend in the future
 */
export const deleteMessage = async (data: DeleteMessageData): Promise<void> => {
  // TODO: Connect to backend API
  console.log('Deleting message:', {
    contactId: data.contactId,
    messageId: data.messageId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Service method to broadcast a message to multiple clients
 * Calls the backend broadcast API to send messages to all selected clients
 */
export const broadcastMessage = async (data: BroadcastMessageData): Promise<void> => {
  const { broadcastMessage: apiBroadcast, markMessageReady } = await import('@/lib/messaging/messaging-api-client');
  const { createBroadcastPayload } = await import('@athli/shared-types');
  const { uploadAttachments } = await import('@/lib/messaging/upload-attachments');
  const { createClient } = await import('@/lib/supabase/client');

  // Get current user ID for idempotency key generation
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Calculate attachment count
  const attachmentCount = (data.images?.length || 0) + (data.pdf ? 1 : 0) + (data.video ? 1 : 0);

  // Create the broadcast payload with pre-generated IDs
  const payload = createBroadcastPayload(
    data.clientIds,
    data.text || '',
    user.id,
    attachmentCount > 0 ? attachmentCount : undefined
  );

  // Call the broadcast API
  const result = await apiBroadcast(payload);

  // If there are attachments, upload them to each message
  if (attachmentCount > 0 && result.results.length > 0) {
    // Build the attachments array from the broadcast data
    const attachmentsToUpload: Array<{
      name: string;
      data: string;
      type: string;
      size: number;
      attachmentType: 'image' | 'video' | 'pdf' | 'audio';
    }> = [];

    // Add images
    if (data.images) {
      for (const img of data.images) {
        attachmentsToUpload.push({
          name: img.name,
          data: img.data,
          type: img.type,
          size: img.size,
          attachmentType: 'image',
        });
      }
    }

    // Add PDF
    if (data.pdf) {
      attachmentsToUpload.push({
        name: data.pdf.name,
        data: data.pdf.data,
        type: data.pdf.type,
        size: data.pdf.size,
        attachmentType: 'pdf',
      });
    }

    // Add video
    if (data.video) {
      attachmentsToUpload.push({
        name: data.video.name,
        data: data.video.data,
        type: data.video.type,
        size: data.video.size,
        attachmentType: 'video',
      });
    }

    // Upload attachments for each message (in parallel)
    const uploadPromises = result.results.map(async (msgResult) => {
      try {
        const uploadResult = await uploadAttachments({
          conversationId: msgResult.conversationId,
          messageId: msgResult.messageId,
          attachments: attachmentsToUpload,
        });

        // If upload succeeded, mark message as ready (in case trigger didn't fire)
        if (uploadResult.success) {
          await markMessageReady(msgResult.messageId);
        }

        return uploadResult;
      } catch (error) {
        console.error(`Failed to upload attachments for message ${msgResult.messageId}:`, error);
        return { success: false, successCount: 0, failedCount: attachmentsToUpload.length, errors: [] };
      }
    });

    await Promise.all(uploadPromises);
  }
};
