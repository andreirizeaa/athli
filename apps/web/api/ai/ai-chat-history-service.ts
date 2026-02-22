/**
 * AI Chat History API client
 */

import axiosInstance from '@/lib/axios';

export interface ChatMessageData {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: { tool: string; status: string; message?: string }[];
  action?: { type: string; payload: any };
}

export interface AiChat {
  id: string;
  coach_id: string;
  title: string;
  data: { messages: ChatMessageData[] };
  created_at: string;
  updated_at: string;
}

/** Listing response omits the heavy data blob */
export type AiChatListItem = Omit<AiChat, 'data'>;

export async function fetchChats(): Promise<AiChatListItem[]> {
  const { data } = await axiosInstance.get('/ai/chats');
  return data.data;
}

export async function fetchChat(id: string): Promise<AiChat> {
  const { data } = await axiosInstance.get(`/ai/chats/${id}`);
  return data.data;
}

export async function createChat(title?: string): Promise<AiChat> {
  const { data } = await axiosInstance.post('/ai/chats', { title });
  return data.data;
}

export async function updateChatTitle(id: string, title: string): Promise<AiChat> {
  const { data } = await axiosInstance.put(`/ai/chats/${id}`, { title });
  return data.data;
}

export async function deleteChat(id: string): Promise<void> {
  await axiosInstance.delete(`/ai/chats/${id}`);
}

export async function appendMessage(
  chatId: string,
  msg: { role: string; content: string; toolCalls?: any[]; action?: any },
): Promise<AiChat> {
  const { data } = await axiosInstance.post(`/ai/chats/${chatId}/messages`, msg);
  return data.data;
}

/** Ask a cheap model to summarize a message into a 50-60 char title */
export async function summarizeTitle(message: string): Promise<string> {
  const { data } = await axiosInstance.post('/ai/summarize-title', { message });
  return data.data.title;
}
