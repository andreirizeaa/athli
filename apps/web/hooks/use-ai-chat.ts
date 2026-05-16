/**
 * useAIChat Hook — Manages AI chat state, SSE streaming, and history persistence.
 *
 * When chatId is provided it loads the existing conversation from the backend.
 * On the first user message of a brand-new chat it creates a record in ai_chats,
 * generates an AI title, and updates the URL so the sidebar reflects the new chat.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  streamChat,
  ConversationMessage,
  ChatContext,
  StreamEvent,
  ActionPayload,
  ChartPayload,
  ClientSelectOption,
} from '@/api/ai/ai-service';
import {
  createChat,
  fetchChat,
  appendMessage as appendMessageApi,
  summarizeTitle,
  updateChatTitle,
  updateChatData,
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
  /** When true, skip window.history.replaceState (used by the side panel) */
  skipUrlUpdate?: boolean;
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

  // Keep onAction in a ref so the SSE stream handler always calls the latest version,
  // even if the options object is recreated between when sendMessage starts and when the
  // action event arrives. This prevents stale closure issues for long-running SSE streams.
  const onActionRef = useRef(options?.onAction);
  useEffect(() => { onActionRef.current = options?.onAction; }, [options?.onAction]);
  const [activeChatId, setActiveChatId] = useState<string | null>(options?.chatId ?? null);

  const queryClient = useQueryClient();

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
              charts: m.charts as ChartPayload[] | undefined,
              clientSelect: m.clientSelect as ClientSelectOption[] | undefined,
              selectedClientId: (m as any).selectedClientId as string | undefined,
            })),
          );
        }
      })
      .catch(() => setError('Failed to load chat history'))
      .finally(() => setIsLoadingHistory(false));
  }, [options?.chatId]);

  // ── Persist helper ───────────────────────────────────────────────

  const persist = useCallback(
    async (role: 'user' | 'assistant', content: string, toolCalls?: ToolCallStatus[], action?: ActionPayload, charts?: ChartPayload[], clientSelect?: ClientSelectOption[]) => {
      if (!chatIdRef.current) return;
      try {
        await appendMessageApi(chatIdRef.current, { role, content, toolCalls: toolCalls as any, action: action as any, charts: charts?.length ? charts : undefined, clientSelect: clientSelect?.length ? clientSelect : undefined });
        queryClient.invalidateQueries({ queryKey: ['ai-chats'] });
      } catch (e) {
        console.error('persist message failed', e);
      }
    },
    [queryClient],
  );

  // ── Send a message ───────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string, context?: ChatContext, displayText?: string) => {
      if (!content.trim() || isStreaming) return;

      setError(null);
      setIsStreaming(true);
      setPendingAction(null);
      setCurrentToolCall(null);

      const trimmed = content.trim();
      const displayContent = displayText || trimmed;

      // Create a new chat record if we don't have one yet
      if (!chatIdRef.current) {
        try {
          const chat = await createChat(); // default title, will be updated
          chatIdRef.current = chat.id;
          setActiveChatId(chat.id);
          queryClient.invalidateQueries({ queryKey: ['ai-chats'] });
          // Update URL without triggering Next.js navigation — this prevents
          // the component from unmounting/remounting (which would kill the
          // SSE stream).
          if (!options?.skipUrlUpdate) {
            window.history.replaceState(null, '', `/assistant/${chat.id}`);
          }
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

      // Add user message to UI (show displayContent, persist displayContent so reload shows the same)
      const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: displayContent, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);

      persist('user', displayContent);

      // Placeholder for assistant response
      const asstId = uuidv4();
      setMessages((prev) => [...prev, { id: asstId, role: 'assistant', content: '', timestamp: new Date(), toolCalls: [] }]);
      streamingMessageRef.current = '';

      // Build conversation history (last 10 messages)
      // For assistant messages that had tool-call actions, include a summary
      // of the action so the AI knows what it previously generated.
      const conversationHistory: ConversationMessage[] = messages.slice(-10).map((m) => {
        let content = m.content;
        if (m.role === 'assistant' && m.action) {
          const actionSummary = `[Used ${m.action.type} tool]`;
          content = content ? `${content}\n${actionSummary}` : actionSummary;
        }
        return { role: m.role, content };
      });

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
                  // Use ref to always call the latest onAction callback, avoiding stale closures
                  onActionRef.current?.(action);
                }
                break;

              case 'client_select':
                if (event.data) {
                  finalClientSelect = event.data;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === asstId ? { ...m, clientSelect: event.data } : m
                    ),
                  );
                }
                break;

              case 'chart':
                if (event.data) {
                  finalCharts.push(event.data);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === asstId ? { ...m, charts: [...(m.charts || []), event.data] } : m
                    ),
                  );
                }
                break;

              case 'error':
                setError(event.data?.message || 'An error occurred');
                break;

              case 'done': {
                setIsStreaming(false);
                setCurrentToolCall(null);

                // Fallback: if the AI output raw JSON instead of using a tool,
                // try to detect and parse it as an action so it still works.
                if (!finalAction && streamingMessageRef.current) {
                  const raw = streamingMessageRef.current.trim();
                  // Check for JSON that looks like an action payload (starts with { and contains "action" or has section/workout keys)
                  const jsonMatch = raw.match(/\{[\s\S]*"(?:action|name|sections|exercises)"[\s\S]*\}/);
                  if (jsonMatch) {
                    try {
                      const parsed = JSON.parse(jsonMatch[0]);
                      // Check if it's a wrapped action like { action: "create_section", payload: {...} }
                      if (parsed.action && parsed.payload) {
                        const action: ActionPayload = { type: parsed.action, payload: parsed.payload };
                        finalAction = action;
                        setPendingAction(action);
                        setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, action, content: '' } : m)));
                        onActionRef.current?.(action);
                      }
                      // Check if it looks like a direct section payload (has name + exercises or type)
                      else if (parsed.name && (parsed.exercises || parsed.sections)) {
                        const actionType = parsed.sections ? 'create_workout' : 'create_section';
                        const action: ActionPayload = { type: actionType, payload: parsed };
                        finalAction = action;
                        setPendingAction(action);
                        setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, action, content: '' } : m)));
                        onActionRef.current?.(action);
                      }
                    } catch {
                      // Not valid JSON, ignore
                    }
                  }
                }

                // Persist assistant message (including tool calls, actions, charts & client selection)
                if (streamingMessageRef.current || finalAction) {
                  persist('assistant', streamingMessageRef.current, finalToolCalls, finalAction, finalCharts, finalClientSelect);
                }
                break;
              }
            }
          },
          abortControllerRef.current.signal,
        );
      } catch (err: any) {
        setError(err.message || 'Failed to send message');
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, options, persist, queryClient],
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
    sessionIdRef.current = uuidv4();
  }, []);

  const clearAction = useCallback(() => setPendingAction(null), []);

  const markClientSelected = useCallback(
    (clientId: string) => {
      // Update local state immediately
      setMessages((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === 'assistant' && updated[i].clientSelect?.length) {
            updated[i] = { ...updated[i], selectedClientId: clientId };
            break;
          }
        }
        return updated;
      });

      // Persist to backend after a delay so the user message append completes first
      const cid = chatIdRef.current;
      if (cid) {
        setTimeout(async () => {
          try {
            const chat = await fetchChat(cid);
            if (!chat?.data?.messages) return;
            const msgs = chat.data.messages;
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].role === 'assistant' && msgs[i].clientSelect?.length) {
                (msgs[i] as any).selectedClientId = clientId;
                break;
              }
            }
            await updateChatData(cid, { messages: msgs });
          } catch (e) {
            console.error('markClientSelected persist failed', e);
          }
        }, 3000);
      }
    },
    [],
  );

  const markActionConfirmed = useCallback(
    async (actionType: string) => {
      if (!chatIdRef.current) return;
      try {
        const chat = await fetchChat(chatIdRef.current);
        if (!chat?.data?.messages) return;

        const msgs = chat.data.messages;
        // Find the last assistant message whose action.type matches
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'assistant' && msgs[i].action?.type === actionType) {
            msgs[i].action!.confirmed = true;
            break;
          }
        }

        await updateChatData(chatIdRef.current, { messages: msgs });

        // Update local state
        setMessages((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].role === 'assistant' && updated[i].action?.type === actionType) {
              updated[i] = {
                ...updated[i],
                action: { ...updated[i].action!, confirmed: true },
              };
              break;
            }
          }
          return updated;
        });
      } catch (e) {
        console.error('markActionConfirmed failed', e);
      }
    },
    [],
  );

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
    clearAction,
    markClientSelected,
    markActionConfirmed,
  };
}
