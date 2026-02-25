/**
 * AI Service — SSE streaming client for the AI backend (Mobile).
 *
 * Uses `fetch` + `ReadableStream` for SSE. React Native 0.71+ supports
 * streaming responses via the Hermes engine, but we guard against missing
 * `ReadableStream` with an explicit check and fallback.
 */

import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/axios';

// ── Types ──────────────────────────────────────────────────────────

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

export type StreamEventType =
  | 'thinking'
  | 'tool_call'
  | 'content'
  | 'action'
  | 'chart'
  | 'client_select'
  | 'error'
  | 'done';

export interface StreamEvent {
  type: StreamEventType;
  data?: Record<string, unknown>;
}

export interface ActionPayload {
  type: 'create_workout' | 'create_section' | 'create_program' | 'assign_workout'
    | 'assign_metric_to_client' | 'add_client_goal' | 'add_client_injury'
    | 'draft_message' | 'update_client_profile' | 'create_checkin_template' | 'create_metric';
  payload: unknown;
  confirmed?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────

/** Request timeout in milliseconds (2 minutes — AI can take a while). */
const REQUEST_TIMEOUT_MS = 120_000;

// ── Auth ───────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

// ── SSE Parser ─────────────────────────────────────────────────────

/**
 * Parse an SSE text chunk into events.
 * Returns any remaining incomplete data as the new buffer.
 */
function parseSSEChunk(
  buffer: string,
  onEvent: (event: StreamEvent) => void,
): string {
  const lines = buffer.split('\n');
  // The last element may be incomplete — keep it as the new buffer
  const remaining = lines.pop() ?? '';

  let currentEvent = '';
  let currentData = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      currentData = line.slice(6);
    } else if (line === '' && currentEvent) {
      // End of event block
      try {
        const parsedData = currentData ? JSON.parse(currentData) : {};
        onEvent({ type: currentEvent as StreamEventType, data: parsedData });
      } catch {
        // Malformed JSON — skip this event
      }
      currentEvent = '';
      currentData = '';
    }
  }

  return remaining;
}

// ── Streaming ──────────────────────────────────────────────────────

/**
 * Stream a chat response from the AI backend via SSE.
 *
 * @param request  Chat request payload
 * @param onEvent  Callback fired for each SSE event
 * @param signal   Optional AbortSignal for cancellation
 */
export async function streamChat(
  request: ChatRequest,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = await getAuthToken();

  if (!token) {
    onEvent({ type: 'error', data: { message: 'Not authenticated. Please log in again.' } });
    onEvent({ type: 'done' });
    return;
  }

  // Create a timeout abort if no external signal provided
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // If the caller also provides a signal, abort when either fires
  const combinedSignal = signal
    ? AbortSignal.any?.([signal, controller.signal]) ?? controller.signal
    : controller.signal;

  // Fallback: listen to the external signal manually if AbortSignal.any is unavailable
  let externalAbortHandler: (() => void) | undefined;
  if (signal && !AbortSignal.any) {
    externalAbortHandler = () => controller.abort();
    signal.addEventListener('abort', externalAbortHandler, { once: true });
  }

  try {
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal: combinedSignal,
    });

    if (!response.ok) {
      let errorMessage = 'Failed to connect to AI';
      try {
        const body = await response.json();
        errorMessage = body?.message || body?.error || errorMessage;
      } catch {
        // response body wasn't JSON
      }
      onEvent({ type: 'error', data: { message: errorMessage } });
      onEvent({ type: 'done' });
      return;
    }

    if (!response.body) {
      onEvent({ type: 'error', data: { message: 'No response stream available.' } });
      onEvent({ type: 'done' });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = parseSSEChunk(buffer, onEvent);
    }

    // Flush any remaining buffer content
    if (buffer.trim()) {
      parseSSEChunk(buffer + '\n\n', onEvent);
    }
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // User cancelled or timeout — don't treat as error
      return;
    }
    const msg =
      error instanceof Error ? error.message : 'Connection to AI failed';
    onEvent({ type: 'error', data: { message: msg } });
  } finally {
    clearTimeout(timeoutId);
    if (externalAbortHandler && signal) {
      signal.removeEventListener('abort', externalAbortHandler);
    }
    // Always emit done so consumers can clean up state
    onEvent({ type: 'done' });
  }
}
