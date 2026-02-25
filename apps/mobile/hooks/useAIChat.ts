/**
 * useAIChat Hook — Manages AI chat state, SSE streaming, and history persistence (Mobile).
 * Port of apps/web/hooks/use-ai-chat.ts
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
  updateChatData,
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

// ── Helper ─────────────────────────────────────────────────────────

function uuid() {
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
  const [activeChatId, setActiveChatId] = useState<string | null>(options?.chatId ?? null);

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
      .catch(() => setError('Failed to load chat history'))
      .finally(() => setIsLoadingHistory(false));
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
          toolCalls: toolCalls as any,
          action: action as any,
          charts: charts?.length ? charts : undefined,
          clientSelect: clientSelect?.length ? clientSelect : undefined,
        });
      } catch (e) {
        console.error('[useAIChat] persist message failed', e);
      }
    },
    [],
  );

  // ── Send a message ───────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string, context?: ChatContext) => {
      if (!content.trim() || isStreaming) return;

      setError(null);
      setIsStreaming(true);
      setPendingAction(null);
      setCurrentToolCall(null);

      const trimmed = content.trim();

      // Create a new chat record if needed
      if (!chatIdRef.current) {
        try {
          const chat = await createChat();
          chatIdRef.current = chat.id;
          setActiveChatId(chat.id);
        } catch {
          setError('Failed to create chat');
          setIsStreaming(false);
          return;
        }
      }

      // Generate title in background
      if (!titleGeneratedRef.current && chatIdRef.current) {
        titleGeneratedRef.current = true;
        const cid = chatIdRef.current;
        summarizeTitle(trimmed)
          .then((title) => updateChatTitle(cid, title))
          .catch((e) => console.error('[useAIChat] title generation failed', e));
      }

      // Add user message
      const userMsg: ChatMessage = { id: uuid(), role: 'user', content: trimmed, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      persist('user', trimmed);

      // Placeholder for assistant
      const asstId = uuid();
      setMessages((prev) => [...prev, { id: asstId, role: 'assistant', content: '', timestamp: new Date(), toolCalls: [] }]);
      streamingMessageRef.current = '';

      const conversationHistory: ConversationMessage[] = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

      abortControllerRef.current = new AbortController();

      let finalToolCalls: ToolCallStatus[] = [];
      let finalAction: ActionPayload | undefined;
      let finalCharts: ChartPayload[] = [];
      let finalClientSelect: ClientSelectOption[] | undefined;

      try {
        await streamChat(
          { message: trimmed, sessionId: sessionIdRef.current, context: context || {}, conversationHistory },
          (event: StreamEvent) => {
            switch (event.type) {
              case 'thinking':
                break;

              case 'tool_call':
                if (event.data) {
                  const ts: ToolCallStatus = { tool: event.data.tool, status: event.data.status, message: event.data.message };
                  setCurrentToolCall(ts);
                  if (event.data.status === 'calling') {
                    finalToolCalls.push(ts);
                    setMessages((prev) =>
                      prev.map((m) => (m.id === asstId ? { ...m, toolCalls: [...(m.toolCalls || []), ts] } : m)),
                    );
                  } else {
                    finalToolCalls = finalToolCalls.map((tc) => (tc.tool === event.data.tool ? { ...tc, status: event.data.status } : tc));
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === asstId && m.toolCalls
                          ? { ...m, toolCalls: m.toolCalls.map((tc) => (tc.tool === event.data.tool ? { ...tc, status: event.data.status } : tc)) }
                          : m,
                      ),
                    );
                  }
                  if (event.data.status === 'complete' || event.data.status === 'error') setCurrentToolCall(null);
                }
                break;

              case 'content':
                if (event.data?.delta) {
                  streamingMessageRef.current += event.data.delta;
                  setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, content: streamingMessageRef.current } : m)));
                }
                break;

              case 'action':
                if (event.data) {
                  const action: ActionPayload = { type: event.data.type, payload: event.data.payload };
                  finalAction = action;
                  setPendingAction(action);
                  setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, action } : m)));
                  options?.onAction?.(action);
                }
                break;

              case 'client_select':
                if (event.data) {
                  finalClientSelect = event.data;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === asstId ? { ...m, clientSelect: event.data } : m)),
                  );
                }
                break;

              case 'chart':
                if (event.data) {
                  finalCharts.push(event.data);
                  setMessages((prev) =>
                    prev.map((m) => (m.id === asstId ? { ...m, charts: [...(m.charts || []), event.data] } : m)),
                  );
                }
                break;

              case 'error':
                setError(event.data?.message || 'An error occurred');
                break;

              case 'done':
                setIsStreaming(false);
                setCurrentToolCall(null);
                if (streamingMessageRef.current) {
                  persist('assistant', streamingMessageRef.current, finalToolCalls, finalAction, finalCharts, finalClientSelect);
                }
                break;
            }
          },
          abortControllerRef.current.signal,
        );
      } catch (err: any) {
        setError(err.message || 'Failed to send message');
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
    setMessages([]);
    setPendingAction(null);
    setError(null);
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
