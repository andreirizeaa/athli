/**
 * AI Chat History API Service
 */

import axiosInstance from '@/lib/axios';

// ── Types ──────────────────────────────────────────────────────────

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

// ── API calls ──────────────────────────────────────────────────────

export async function fetchChats(): Promise<AiChat[]> {
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

export async function updateChat(id: string, updates: { title?: string; data?: { messages: ChatMessageData[] } }): Promise<AiChat> {
  const { data } = await axiosInstance.put(`/ai/chats/${id}`, updates);
  return data.data;
}

export async function deleteChat(id: string): Promise<void> {
  await axiosInstance.delete(`/ai/chats/${id}`);
}

export async function appendMessage(
  chatId: string,
  message: { role: string; content: string; toolCalls?: any[]; action?: any }
): Promise<AiChat> {
  const { data } = await axiosInstance.post(`/ai/chats/${chatId}/messages`, message);
  return data.data;
}
