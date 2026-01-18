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
 * This will be connected to the backend in the future
 */
export const broadcastMessage = async (data: BroadcastMessageData): Promise<void> => {
  // TODO: Connect to backend API
  console.log('Broadcasting message:', {
    clientIds: data.clientIds,
    clientCount: data.clientIds.length,
    text: data.text || '(no text)',
    hasPdf: !!data.pdf,
    pdfName: data.pdf?.name,
    hasImages: !!data.images && data.images.length > 0,
    imageCount: data.images?.length || 0,
    hasVideo: !!data.video,
    videoName: data.video?.name,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));
};
