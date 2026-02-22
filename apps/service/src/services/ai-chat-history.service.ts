/**
 * AI Chat History Service — CRUD for the ai_chats table
 */

import { getSupabaseClient } from './supabase.service';

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

const TABLE = 'ai_chats';

export async function createChat(coachId: string, title?: string): Promise<AiChat> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ coach_id: coachId, title: title || 'New Chat', data: { messages: [] } })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Returns chats in reverse-chronological order (most recent first). */
export async function listChats(coachId: string): Promise<Omit<AiChat, 'data'>[]> {
  const supabase = getSupabaseClient();
  // Intentionally omit the full data blob from the listing — sidebar only needs metadata
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, coach_id, title, created_at, updated_at')
    .eq('coach_id', coachId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getChat(id: string, coachId: string): Promise<AiChat | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('coach_id', coachId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateChat(
  id: string,
  coachId: string,
  updates: { title?: string; data?: { messages: ChatMessageData[] } },
): Promise<AiChat> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .eq('coach_id', coachId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteChat(id: string, coachId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('coach_id', coachId);
  if (error) throw error;
}

/**
 * Append a single message to a chat's JSONB data.messages array.
 * Returns the full updated chat.
 */
export async function appendMessage(id: string, coachId: string, msg: ChatMessageData): Promise<AiChat> {
  const chat = await getChat(id, coachId);
  if (!chat) throw new Error('Chat not found');
  const messages = [...(chat.data?.messages || []), msg];
  return updateChat(id, coachId, { data: { messages } });
}
