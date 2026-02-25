/**
 * AI Service - Handles communication with the AI backend via SSE (Mobile)
 */

import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/axios';

// Types
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  currentPage?: string;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
  context: ChatContext;
  conversationHistory: ConversationMessage[];
}

export interface ChartPayload {
  type: 'line' | 'bar' | 'area';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  data: Array<Record<string, string | number>>;
  series: Array<{ dataKey: string; label: string; color?: string }>;
}

export interface ClientSelectOption {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  category?: string;
  status?: string;
}

export interface StreamEvent {
  type: 'thinking' | 'tool_call' | 'content' | 'action' | 'chart' | 'client_select' | 'error' | 'done';
  data?: any;
}

export interface ActionPayload {
  type: 'create_workout' | 'create_section' | 'create_program' | 'assign_workout';
  payload: any;
  confirmed?: boolean;
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Stream chat response from the AI backend using SSE
 */
export async function streamChat(
  request: ChatRequest,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = await getAuthToken();

  if (!token) {
    onEvent({ type: 'error', data: { message: 'Not authenticated' } });
    onEvent({ type: 'done' });
    return;
  }

  try {
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      onEvent({ type: 'error', data: { message: error.message || 'Failed to connect to AI' } });
      onEvent({ type: 'done' });
      return;
    }

    if (!response.body) {
      onEvent({ type: 'error', data: { message: 'No response body' } });
      onEvent({ type: 'done' });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = '';
      let currentData = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6);
        } else if (line === '' && currentEvent) {
          try {
            const parsedData = currentData ? JSON.parse(currentData) : {};
            onEvent({ type: currentEvent as StreamEvent['type'], data: parsedData });
          } catch {
            // Invalid JSON, skip
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') return;
    onEvent({ type: 'error', data: { message: error.message || 'Connection failed' } });
    onEvent({ type: 'done' });
  }
}
