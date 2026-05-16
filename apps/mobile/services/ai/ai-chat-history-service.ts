/**
 * AI Chat History API client (Mobile)
 */

import { apiFetch } from '@/lib/api-client';

export interface ChatMessageData {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: { tool: string; status: string; message?: string }[];
  action?: { type: string; payload: any; confirmed?: boolean };
  charts?: any[];
  clientSelect?: any[];
}

export interface AiChat {
  id: string;
  coach_id: string;
  title: string;
  data: { messages: ChatMessageData[] };
  created_at: string;
  updated_at: string;
}

export type AiChatListItem = Omit<AiChat, 'data'>;

export async function fetchChats(): Promise<AiChatListItem[]> {
  const data = await apiFetch('/ai/chats');
  return data.data;
}

export async function fetchChat(id: string): Promise<AiChat> {
  const data = await apiFetch(`/ai/chats/${id}`);
  return data.data;
}

export async function createChat(title?: string): Promise<AiChat> {
  const data = await apiFetch('/ai/chats', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return data.data;
}

export async function updateChatTitle(id: string, title: string): Promise<AiChat> {
  const data = await apiFetch(`/ai/chats/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
  return data.data;
}

export async function deleteChat(id: string): Promise<void> {
  await apiFetch(`/ai/chats/${id}`, { method: 'DELETE' });
}

export async function updateChatData(id: string, chatData: { messages: ChatMessageData[] }): Promise<AiChat> {
  const data = await apiFetch(`/ai/chats/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ data: chatData }),
  });
  return data.data;
}

export async function appendMessage(
  chatId: string,
  msg: { role: string; content: string; toolCalls?: any[]; action?: any; charts?: any[]; clientSelect?: any[] },
): Promise<AiChat> {
  const data = await apiFetch(`/ai/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify(msg),
  });
  return data.data;
}

export async function summarizeTitle(message: string): Promise<string> {
  const data = await apiFetch('/ai/summarize-title', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return data.data.title;
}
