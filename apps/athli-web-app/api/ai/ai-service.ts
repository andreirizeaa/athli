/**
 * AI Service - Handles communication with the AI backend via SSE
 */

import { createClient } from '@/supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3002';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION?.replace(/^\/+|\/+$/g, '') || 'api/v1';
const API_URL = `${API_BASE_URL}/${API_VERSION}`;

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

export interface StreamEvent {
  type: 'thinking' | 'tool_call' | 'content' | 'action' | 'error' | 'done';
  data?: any;
}

export interface ActionPayload {
  type: 'create_workout' | 'create_section' | 'create_program';
  payload: any;
}

/**
 * Get the auth token from Supabase
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Stream chat response from the AI backend
 * Uses Server-Sent Events for streaming
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
        'Authorization': `Bearer ${token}`,
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

    // Read SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      let currentEvent = '';
      let currentData = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6);
        } else if (line === '' && currentEvent) {
          // End of event, emit it
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
    if (error.name === 'AbortError') {
      // Request was cancelled, don't emit error
      return;
    }
    onEvent({ type: 'error', data: { message: error.message || 'Connection failed' } });
    onEvent({ type: 'done' });
  }
}

/**
 * Check AI service health
 */
export async function checkAIHealth(): Promise<{
  status: string;
  openRouterConfigured: boolean;
  langSmithConfigured: boolean;
  tracingEnabled: boolean;
}> {
  const response = await fetch(`${API_URL}/ai/health`);
  const data = await response.json();
  return data.data;
}
