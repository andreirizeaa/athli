/**
 * useAIChat Hook — Manages AI chat state, SSE streaming, and history persistence (Mobile).
 * Port of apps/web/hooks/use-ai-chat.ts with React Native adaptations.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  streamChat,
  type ConversationMessage,
  type ChatContext,
  type StreamEvent,
  type ActionPayload,
  type ChartPayload,
  type ClientSelectOption,
} from '@/services/ai/ai-service';
import {
  createChat,
  fetchChat,
  appendMessage as appendMessageApi,
  summarizeTitle,
  updateChatTitle,
  type ChatMessageData,
} from '@/services/ai/ai-chat-history-service';

// ── Types ──────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallStatus[];
  action?: ActionPayload;
  charts?: ChartPayload[];
  clientSelect?: ClientSelectOption[];
  selectedClientId?: string;
}

export interface ToolCallStatus {
  tool: string;
  status: 'calling' | 'complete' | 'error';
  message?: string;
}

export interface UseAIChatOptions {
  chatId?: string;
  onAction?: (action: ActionPayload) => void;
}

// ── UUID ───────────────────────────────────────────────────────────

/** Generate a v4 UUID. Uses crypto.randomUUID when available, falls back to Math.random. */
function uuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback — adequate for UI keys, NOT for security
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Hook ───────────────────────────────────────────────────────────

export function useAIChat(options?: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCallStatus | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(uuid());
  const streamingMessageRef = useRef<string>('');
  const chatIdRef = useRef<string | null>(options?.chatId ?? null);
  const titleGeneratedRef = useRef(false);
  const isMountedRef = useRef(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(options?.chatId ?? null);

  // ── Cleanup on unmount ───────────────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Abort any in-flight stream
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  // ── Load existing chat ───────────────────────────────────────────

  useEffect(() => {
    if (!options?.chatId) {
      chatIdRef.current = null;
      setActiveChatId(null);
      titleGeneratedRef.current = false;
      return;
    }
    chatIdRef.current = options.chatId;
    setActiveChatId(options.chatId);
    titleGeneratedRef.current = true;
    setIsLoadingHistory(true);

    fetchChat(options.chatId)
      .then((chat) => {
        if (!isMountedRef.current) return;
        if (chat?.data?.messages) {
          setMessages(
            chat.data.messages.map((m: ChatMessageData, i: number) => ({
              id: `loaded-${i}`,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
              toolCalls: m.toolCalls as ToolCallStatus[] | undefined,
              action: m.action as ActionPayload | undefined,
              charts: m.charts as ChartPayload[] | undefined,
              clientSelect: m.clientSelect as ClientSelectOption[] | undefined,
            })),
          );
        }
      })
      .catch((err) => {
        if (!isMountedRef.current) return;
        console.error('[useAIChat] Failed to load chat:', err);
        setError('Failed to load chat history.');
      })
      .finally(() => {
        if (isMountedRef.current) setIsLoadingHistory(false);
      });
  }, [options?.chatId]);

  // ── Persist helper ───────────────────────────────────────────────

  const persist = useCallback(
    async (
      role: 'user' | 'assistant',
      content: string,
      toolCalls?: ToolCallStatus[],
      action?: ActionPayload,
      charts?: ChartPayload[],
      clientSelect?: ClientSelectOption[],
    ) => {
      if (!chatIdRef.current) return;
      try {
        await appendMessageApi(chatIdRef.current, {
          role,
          content,
          toolCalls: toolCalls as ChatMessageData['toolCalls'],
          action: action as ChatMessageData['action'],
          charts: charts?.length ? (charts as ChatMessageData['charts']) : undefined,
          clientSelect: clientSelect?.length ? (clientSelect as ChatMessageData['clientSelect']) : undefined,
        });
      } catch (e) {
        // Non-fatal: the message is already shown in the UI
        console.error('[useAIChat] Failed to persist message:', e);
      }
    },
    [],
  );

  // ── Send a message ───────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string, context?: ChatContext) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      // Guard against double-send while streaming
      if (isStreaming) {
        console.warn('[useAIChat] Ignoring send — already streaming.');
        return;
      }

      setError(null);
      setIsStreaming(true);
      setPendingAction(null);
      setCurrentToolCall(null);

      // Create chat record if this is a new conversation
      if (!chatIdRef.current) {
        try {
          const chat = await createChat();
          if (!isMountedRef.current) return;
          chatIdRef.current = chat.id;
          setActiveChatId(chat.id);
        } catch (err) {
          if (!isMountedRef.current) return;
          console.error('[useAIChat] Failed to create chat:', err);
          setError('Failed to start a new chat. Please try again.');
          setIsStreaming(false);
          return;
        }
      }

      // Generate title in the background (fire-and-forget)
      if (!titleGeneratedRef.current && chatIdRef.current) {
        titleGeneratedRef.current = true;
        const cid = chatIdRef.current;
        summarizeTitle(trimmed)
          .then((title) => updateChatTitle(cid, title))
          .catch((e) => console.error('[useAIChat] Title generation failed:', e));
      }

      // Add user message to UI
      const userMsg: ChatMessage = { id: uuid(), role: 'user', content: trimmed, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      persist('user', trimmed);

      // Placeholder for assistant response
      const asstId = uuid();
      setMessages((prev) => [
        ...prev,
        { id: asstId, role: 'assistant', content: '', timestamp: new Date(), toolCalls: [] },
      ]);
      streamingMessageRef.current = '';

      // Build conversation history (last 10 messages for context)
      const conversationHistory: ConversationMessage[] = messages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      abortControllerRef.current = new AbortController();

      const finalToolCalls: ToolCallStatus[] = [];
      let finalAction: ActionPayload | undefined;
      const finalCharts: ChartPayload[] = [];
      let finalClientSelect: ClientSelectOption[] | undefined;

      try {
        await streamChat(
          {
            message: trimmed,
            sessionId: sessionIdRef.current,
            context: context || {},
            conversationHistory,
          },
          (event: StreamEvent) => {
            if (!isMountedRef.current) return;

            switch (event.type) {
              case 'thinking':
                // Could show a thinking indicator — currently no-op
                break;

              case 'tool_call': {
                if (!event.data) break;
                const toolName = event.data.tool as string;
                const toolStatus = event.data.status as ToolCallStatus['status'];
                const toolMessage = event.data.message as string | undefined;

                const ts: ToolCallStatus = { tool: toolName, status: toolStatus, message: toolMessage };
                setCurrentToolCall(ts);

                if (toolStatus === 'calling') {
                  finalToolCalls.push(ts);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === asstId ? { ...m, toolCalls: [...(m.toolCalls || []), ts] } : m,
                    ),
                  );
                } else {
                  // Update existing tool call status
                  const idx = finalToolCalls.findIndex((tc) => tc.tool === toolName);
                  if (idx >= 0) finalToolCalls[idx] = { ...finalToolCalls[idx], status: toolStatus };
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === asstId && m.toolCalls
                        ? {
                            ...m,
                            toolCalls: m.toolCalls.map((tc) =>
                              tc.tool === toolName ? { ...tc, status: toolStatus } : tc,
                            ),
                          }
                        : m,
                    ),
                  );
                }

                if (toolStatus === 'complete' || toolStatus === 'error') {
                  setCurrentToolCall(null);
                }
                break;
              }

              case 'content': {
                const delta = (event.data?.delta as string) ?? '';
                if (delta) {
                  streamingMessageRef.current += delta;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === asstId ? { ...m, content: streamingMessageRef.current } : m,
                    ),
                  );
                }
                break;
              }

              case 'action': {
                if (!event.data) break;
                const action: ActionPayload = {
                  type: event.data.type as ActionPayload['type'],
                  payload: event.data.payload,
                };
                finalAction = action;
                setPendingAction(action);
                setMessages((prev) =>
                  prev.map((m) => (m.id === asstId ? { ...m, action } : m)),
                );
                options?.onAction?.(action);
                break;
              }

              case 'client_select': {
                if (!event.data) break;
                finalClientSelect = event.data as unknown as ClientSelectOption[];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === asstId ? { ...m, clientSelect: finalClientSelect } : m,
                  ),
                );
                break;
              }

              case 'chart': {
                if (!event.data) break;
                const chart = event.data as unknown as ChartPayload;
                finalCharts.push(chart);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === asstId ? { ...m, charts: [...(m.charts || []), chart] } : m,
                  ),
                );
                break;
              }

              case 'error': {
                const errMsg = (event.data?.message as string) || 'An error occurred';
                setError(errMsg);
                break;
              }

              case 'done': {
                setIsStreaming(false);
                setCurrentToolCall(null);
                // Persist assistant message
                if (streamingMessageRef.current || finalToolCalls.length > 0 || finalAction) {
                  persist(
                    'assistant',
                    streamingMessageRef.current,
                    finalToolCalls.length > 0 ? finalToolCalls : undefined,
                    finalAction,
                    finalCharts.length > 0 ? finalCharts : undefined,
                    finalClientSelect,
                  );
                }
                break;
              }
            }
          },
          abortControllerRef.current.signal,
        );
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : 'Failed to send message';
        setError(msg);
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, options, persist],
  );

  // ── Controls ─────────────────────────────────────────────────────

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setCurrentToolCall(null);
  }, []);

  const clearChat = useCallback(() => {
    // Abort any in-flight stream first
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setMessages([]);
    setPendingAction(null);
    setError(null);
    setIsStreaming(false);
    setCurrentToolCall(null);
    chatIdRef.current = null;
    setActiveChatId(null);
    titleGeneratedRef.current = false;
    sessionIdRef.current = uuid();
  }, []);

  return {
    chatId: activeChatId,
    messages,
    isStreaming,
    isLoadingHistory,
    currentToolCall,
    pendingAction,
    error,
    sendMessage,
    stopStreaming,
    clearChat,
  };
}
