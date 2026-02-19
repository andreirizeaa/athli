/**
 * useAIChat Hook - Manages AI chat state and SSE streaming
 */

import { useState, useCallback, useRef } from 'react';
import { streamChat, ConversationMessage, ChatContext, StreamEvent, ActionPayload } from '@/api/ai/ai-service';
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
  onAction?: (action: ActionPayload) => void;
}

export function useAIChat(options?: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCallStatus | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(uuidv4());
  const streamingMessageRef = useRef<string>('');

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

    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

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
              // Already showing streaming indicator
              break;

            case 'tool_call':
              if (event.data) {
                const toolStatus: ToolCallStatus = {
                  tool: event.data.tool,
                  status: event.data.status,
                  message: event.data.message,
                };
                setCurrentToolCall(toolStatus);

                // Add to message's tool calls
                if (event.data.status === 'calling') {
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
                  // Update existing tool call status
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
                setPendingAction(action);

                // Add action to message
                setMessages(prev => prev.map(msg => {
                  if (msg.id === assistantMessageId) {
                    return { ...msg, action };
                  }
                  return msg;
                }));

                // Notify parent if callback provided
                options?.onAction?.(action);
              }
              break;

            case 'error':
              setError(event.data?.message || 'An error occurred');
              break;

            case 'done':
              setIsStreaming(false);
              setCurrentToolCall(null);
              break;
          }
        },
        abortControllerRef.current.signal
      );
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setIsStreaming(false);
    }
  }, [messages, isStreaming, options]);

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
   * Clear the chat history
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingAction(null);
    setError(null);
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
    currentToolCall,
    pendingAction,
    error,
    sendMessage,
    stopStreaming,
    clearChat,
    clearAction,
  };
}
