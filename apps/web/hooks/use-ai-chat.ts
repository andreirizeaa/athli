/**
 * useAIChat Hook — Manages AI chat state, SSE streaming, and history persistence.
 *
 * When chatId is provided it loads the existing conversation from the backend.
 * On the first user message of a brand-new chat it creates a record in ai_chats,
 * generates an AI title, and updates the URL so the sidebar reflects the new chat.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  streamChat,
  ConversationMessage,
  ChatContext,
  StreamEvent,
  ActionPayload,
} from '@/api/ai/ai-service';
import {
  createChat,
  fetchChat,
  appendMessage as appendMessageApi,
  summarizeTitle,
  updateChatTitle,
  ChatMessageData,
} from '@/api/ai/ai-chat-history-service';
import { v4 as uuidv4 } from 'uuid';

// ── Types ──────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallStatus[];
  action?: ActionPayload;
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

// ── Hook ───────────────────────────────────────────────────────────

export function useAIChat(options?: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCallStatus | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(uuidv4());
  const streamingMessageRef = useRef<string>('');
  const chatIdRef = useRef<string | null>(options?.chatId ?? null);
  const titleGeneratedRef = useRef(false);

  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Load existing chat ───────────────────────────────────────────

  useEffect(() => {
    if (!options?.chatId) {
      chatIdRef.current = null;
      titleGeneratedRef.current = false;
      return;
    }
    chatIdRef.current = options.chatId;
    titleGeneratedRef.current = true; // existing chat already has a title
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
            })),
          );
        }
      })
      .catch(() => setError('Failed to load chat history'))
      .finally(() => setIsLoadingHistory(false));
  }, [options?.chatId]);

  // ── Persist helper ───────────────────────────────────────────────

  const persist = useCallback(
    async (role: 'user' | 'assistant', content: string, toolCalls?: ToolCallStatus[], action?: ActionPayload) => {
      if (!chatIdRef.current) return;
      try {
        await appendMessageApi(chatIdRef.current, { role, content, toolCalls: toolCalls as any, action: action as any });
        queryClient.invalidateQueries({ queryKey: ['ai-chats'] });
      } catch (e) {
        console.error('persist message failed', e);
      }
    },
    [queryClient],
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

      // Create a new chat record if we don't have one yet
      if (!chatIdRef.current) {
        try {
          const chat = await createChat(); // default title, will be updated
          chatIdRef.current = chat.id;
          queryClient.invalidateQueries({ queryKey: ['ai-chats'] });
          router.replace(`/assistant/${chat.id}`, { scroll: false });
        } catch {
          setError('Failed to create chat');
          setIsStreaming(false);
          return;
        }
      }

      // Generate AI title in the background after the first user message
      if (!titleGeneratedRef.current && chatIdRef.current) {
        titleGeneratedRef.current = true;
        const cid = chatIdRef.current;
        summarizeTitle(trimmed)
          .then((title) => updateChatTitle(cid, title))
          .then(() => queryClient.invalidateQueries({ queryKey: ['ai-chats'] }))
          .catch((e) => console.error('title generation failed', e));
      }

      // Add user message to UI
      const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: trimmed, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      persist('user', trimmed);

      // Placeholder for assistant response
      const asstId = uuidv4();
      setMessages((prev) => [...prev, { id: asstId, role: 'assistant', content: '', timestamp: new Date(), toolCalls: [] }]);
      streamingMessageRef.current = '';

      // Build conversation history (last 10 messages)
      const conversationHistory: ConversationMessage[] = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

      abortControllerRef.current = new AbortController();

      let finalToolCalls: ToolCallStatus[] = [];
      let finalAction: ActionPayload | undefined;

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

              case 'error':
                setError(event.data?.message || 'An error occurred');
                break;

              case 'done':
                setIsStreaming(false);
                setCurrentToolCall(null);
                // Persist assistant message (including tool calls & actions)
                if (streamingMessageRef.current) {
                  persist('assistant', streamingMessageRef.current, finalToolCalls, finalAction);
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
    [messages, isStreaming, options, persist, router, queryClient],
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
    titleGeneratedRef.current = false;
    sessionIdRef.current = uuidv4();
  }, []);

  const clearAction = useCallback(() => setPendingAction(null), []);

  return {
    messages,
    isStreaming,
    isLoadingHistory,
    currentToolCall,
    pendingAction,
    error,
    sendMessage,
    stopStreaming,
    clearChat,
    clearAction,
  };
}
