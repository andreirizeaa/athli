export interface MessageFile {
  name: string;
  data: string; // base64 encoded
  type: string;
  size: number;
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
  pdf?: MessageFile;
  images?: MessageFile[];
  video?: MessageFile;
  repliedTo?: RepliedToMessage;
}

/**
 * Dummy message service method to send messages
 * This will be connected to the backend in the future
 */
export const sendMessage = async (data: SendMessageData): Promise<void> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

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

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/messages', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to send message')
};

export interface DeleteMessageData {
  contactId: string;
  messageId: string;
}

/**
 * Dummy message service method to delete messages
 * This will be connected to the backend in the future
 */
export const deleteMessage = async (data: DeleteMessageData): Promise<void> => {
  // TODO: Connect to backend API
  // This is a placeholder that logs the data for now

  console.log('Deleting message:', {
    contactId: data.contactId,
    messageId: data.messageId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/messages/${data.messageId}`, {
  //   method: 'DELETE',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ contactId: data.contactId }),
  // })
  // if (!response.ok) throw new Error('Failed to delete message')
};
