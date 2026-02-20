/**
 * useAIChat Hook - Manages AI chat state, SSE streaming, and history persistence
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { streamChat, ConversationMessage, ChatContext, StreamEvent, ActionPayload } from '@/api/ai/ai-service';
import {
  createChat,
  fetchChat,
  appendMessage as appendMessageApi,
  updateChat,
  ChatMessageData,
} from '@/api/ai/ai-chat-history-service';
import { v4 as uuidv4 } from 'uuid';

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

export function useAIChat(options?: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCallStatus | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(uuidv4());
  const streamingMessageRef = useRef<string>('');
  const chatIdRef = useRef<string | null>(options?.chatId || null);

  const router = useRouter();
  const queryClient = useQueryClient();

  // Load existing chat if chatId provided
  useEffect(() => {
    if (!options?.chatId) return;

    chatIdRef.current = options.chatId;
    setIsLoadingHistory(true);

    fetchChat(options.chatId)
      .then((chat) => {
        if (chat?.data?.messages) {
          const loaded: ChatMessage[] = chat.data.messages.map((m: ChatMessageData, i: number) => ({
            id: `loaded-${i}`,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
            toolCalls: m.toolCalls as ToolCallStatus[] | undefined,
            action: m.action as ActionPayload | undefined,
          }));
          setMessages(loaded);
        }
      })
      .catch((err) => {
        console.error('Failed to load chat history:', err);
        setError('Failed to load chat history');
      })
      .finally(() => setIsLoadingHistory(false));
  }, [options?.chatId]);

  /**
   * Persist a message to the backend
   */
  const persistMessage = useCallback(
    async (role: 'user' | 'assistant', content: string, toolCalls?: ToolCallStatus[], action?: ActionPayload) => {
      if (!chatIdRef.current) return;
      try {
        await appendMessageApi(chatIdRef.current, {
          role,
          content,
          toolCalls: toolCalls as any,
          action: action as any,
        });
        queryClient.invalidateQueries({ queryKey: ['ai-chats'] });
      } catch (err) {
        console.error('Failed to persist message:', err);
      }
    },
    [queryClient]
  );

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(async (
    content: string,
    context?: ChatContext
  ) => {
    if (!content.trim() || isStreaming) return;

    setError(null);
    setIsStreaming(true);
    setPendingAction(null);
    setCurrentToolCall(null);

    // If no chat exists yet, create one
    if (!chatIdRef.current) {
      try {
        const title = content.trim().slice(0, 50) + (content.trim().length > 50 ? '...' : '');
        const chat = await createChat(title);
        chatIdRef.current = chat.id;
        queryClient.invalidateQueries({ queryKey: ['ai-chats'] });
        // Update URL to reflect the new chat ID
        router.replace(`/assistant/${chat.id}`, { scroll: false });
      } catch (err) {
        console.error('Failed to create chat:', err);
        setError('Failed to create chat');
        setIsStreaming(false);
        return;
      }
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Persist user message
    await persistMessage('user', content.trim());

    // Create assistant message placeholder
    const assistantMessageId = uuidv4();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: [],
    };

    setMessages(prev => [...prev, assistantMessage]);
    streamingMessageRef.current = '';

    // Build conversation history (last 10 messages)
    const conversationHistory: ConversationMessage[] = messages
      .slice(-10)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    // Create abort controller
    abortControllerRef.current = new AbortController();

    let finalToolCalls: ToolCallStatus[] = [];
    let finalAction: ActionPayload | undefined;

    try {
      await streamChat(
        {
          message: content.trim(),
          sessionId: sessionIdRef.current,
          context: context || {},
          conversationHistory,
        },
        (event: StreamEvent) => {
          switch (event.type) {
            case 'thinking':
              break;

            case 'tool_call':
              if (event.data) {
                const toolStatus: ToolCallStatus = {
                  tool: event.data.tool,
                  status: event.data.status,
                  message: event.data.message,
                };
                setCurrentToolCall(toolStatus);

                if (event.data.status === 'calling') {
                  finalToolCalls.push(toolStatus);
                  setMessages(prev => prev.map(msg => {
                    if (msg.id === assistantMessageId) {
                      return {
                        ...msg,
                        toolCalls: [...(msg.toolCalls || []), toolStatus],
                      };
                    }
                    return msg;
                  }));
                } else {
                  finalToolCalls = finalToolCalls.map(tc =>
                    tc.tool === event.data.tool ? { ...tc, status: event.data.status } : tc
                  );
                  setMessages(prev => prev.map(msg => {
                    if (msg.id === assistantMessageId && msg.toolCalls) {
                      return {
                        ...msg,
                        toolCalls: msg.toolCalls.map(tc =>
                          tc.tool === event.data.tool ? { ...tc, status: event.data.status } : tc
                        ),
                      };
                    }
                    return msg;
                  }));
                }

                if (event.data.status === 'complete' || event.data.status === 'error') {
                  setCurrentToolCall(null);
                }
              }
              break;

            case 'content':
              if (event.data?.delta) {
                streamingMessageRef.current += event.data.delta;
                setMessages(prev => prev.map(msg => {
                  if (msg.id === assistantMessageId) {
                    return { ...msg, content: streamingMessageRef.current };
                  }
                  return msg;
                }));
              }
              break;

            case 'action':
              if (event.data) {
                const action: ActionPayload = {
                  type: event.data.type,
                  payload: event.data.payload,
                };
                finalAction = action;
                setPendingAction(action);

                setMessages(prev => prev.map(msg => {
                  if (msg.id === assistantMessageId) {
                    return { ...msg, action };
                  }
                  return msg;
                }));

                options?.onAction?.(action);
              }
              break;

            case 'error':
              setError(event.data?.message || 'An error occurred');
              break;

            case 'done':
              setIsStreaming(false);
              setCurrentToolCall(null);

              // Persist assistant message
              if (streamingMessageRef.current) {
                persistMessage('assistant', streamingMessageRef.current, finalToolCalls, finalAction);
              }
              break;
          }
        },
        abortControllerRef.current.signal
      );
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setIsStreaming(false);
    }
  }, [messages, isStreaming, options, persistMessage, router, queryClient]);

  /**
   * Stop the current streaming response
   */
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setCurrentToolCall(null);
  }, []);

  /**
   * Clear the chat history (start fresh)
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingAction(null);
    setError(null);
    chatIdRef.current = null;
    sessionIdRef.current = uuidv4();
  }, []);

  /**
   * Clear the pending action
   */
  const clearAction = useCallback(() => {
    setPendingAction(null);
  }, []);

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
