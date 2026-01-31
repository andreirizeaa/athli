/**
 * LangGraph ReAct Agent for Athli AI Assistant
 * Uses OpenRouter for LLM access and LangSmith for observability
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { createAllTools, ToolContext } from '../../api/v1/ai/tools';
import { buildSystemPromptWithContext, TOOL_STATUS_MESSAGES } from './prompts';

// Types
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  currentPage?: string;
}

export interface StreamEvent {
  type: 'thinking' | 'tool_call' | 'content' | 'action' | 'error' | 'done';
  data?: any;
}

export type StreamCallback = (event: StreamEvent) => void;

// Agent configuration
const MAX_ITERATIONS = 10;
const REQUEST_TIMEOUT_MS = 60000;

/**
 * Create the LLM instance configured for OpenRouter
 */
const createLLM = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  // Set OPENAI_API_KEY for LangChain compatibility (it reads from env)
  process.env.OPENAI_API_KEY = apiKey;

  return new ChatOpenAI({
    modelName: 'openai/gpt-4o',
    openAIApiKey: apiKey,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://athli.app',
        'X-Title': 'Athli AI Assistant',
      },
    },
    temperature: 0.7,
    maxTokens: 4096,
    streaming: true,
  });
};

/**
 * Convert conversation history to LangChain messages
 */
const convertToLangChainMessages = (history: ConversationMessage[]): BaseMessage[] => {
  return history.map((msg) => {
    if (msg.role === 'user') {
      return new HumanMessage(msg.content);
    } else {
      return new AIMessage(msg.content);
    }
  });
};

/**
 * Extract action payload from tool responses
 */
const extractActionFromToolResponse = (toolResponse: string): { type: string; payload: any } | null => {
  try {
    const parsed = JSON.parse(toolResponse);
    if (parsed.success && parsed.action && parsed.payload) {
      return {
        type: parsed.action,
        payload: parsed.payload,
      };
    }
  } catch {
    // Not a JSON response or not an action
  }
  return null;
};

/**
 * Run the AI agent with streaming
 */
export const runAgent = async (
  message: string,
  conversationHistory: ConversationMessage[],
  context: ChatContext,
  toolContext: ToolContext,
  onStream: StreamCallback
): Promise<void> => {
  const llm = createLLM();
  const tools = createAllTools(toolContext);
  const llmWithTools = llm.bindTools(tools);

  // Build messages
  const systemPrompt = buildSystemPromptWithContext({
    coachId: toolContext.coachId,
  });

  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...convertToLangChainMessages(conversationHistory),
    new HumanMessage(message),
  ];

  let iterations = 0;
  let pendingAction: { type: string; payload: any } | null = null;

  // Send thinking event
  onStream({ type: 'thinking' });

  try {
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      // Call LLM with tools
      const response = await llmWithTools.invoke(messages, {
        timeout: REQUEST_TIMEOUT_MS,
      });

      // Check if there are tool calls
      const toolCalls = response.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        // No tool calls, stream the final response
        const content = typeof response.content === 'string' ? response.content : '';

        // Stream content character by character (simulated streaming for non-streaming response)
        for (let i = 0; i < content.length; i += 10) {
          onStream({
            type: 'content',
            data: { delta: content.slice(i, i + 10) },
          });
          // Small delay for smooth streaming effect
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        // If we have a pending action, send it
        if (pendingAction) {
          onStream({
            type: 'action',
            data: pendingAction,
          });
        }

        onStream({ type: 'done' });
        return;
      }

      // Process tool calls
      messages.push(response);

      for (const toolCall of toolCalls) {
        const toolName = toolCall.name;
        const statusMessage = TOOL_STATUS_MESSAGES[toolName] || `Calling ${toolName}...`;

        // Send tool call status
        onStream({
          type: 'tool_call',
          data: { tool: toolName, status: 'calling', message: statusMessage },
        });

        // Find and execute the tool
        const tool = tools.find((t) => t.name === toolName);
        if (!tool) {
          const errorMessage = `Tool ${toolName} not found`;
          messages.push(
            new ToolMessage({
              tool_call_id: toolCall.id || '',
              content: JSON.stringify({ error: errorMessage }),
            })
          );
          continue;
        }

        try {
          const result = await tool.invoke(toolCall.args);
          const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

          // Check if this is an action payload
          const action = extractActionFromToolResponse(resultStr);
          if (action) {
            pendingAction = action;
          }

          messages.push(
            new ToolMessage({
              tool_call_id: toolCall.id || '',
              content: resultStr,
            })
          );

          // Send tool complete status
          onStream({
            type: 'tool_call',
            data: { tool: toolName, status: 'complete' },
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Tool execution failed';
          messages.push(
            new ToolMessage({
              tool_call_id: toolCall.id || '',
              content: JSON.stringify({ error: errorMessage }),
            })
          );

          onStream({
            type: 'tool_call',
            data: { tool: toolName, status: 'error', message: errorMessage },
          });
        }
      }
    }

    // Max iterations reached
    onStream({
      type: 'error',
      data: { message: 'This request is too complex. Try breaking it into smaller steps.' },
    });
    onStream({ type: 'done' });
  } catch (error: any) {
    console.error('Agent error:', error);

    let errorMessage = 'An error occurred while processing your request.';
    if (error.message?.includes('timeout')) {
      errorMessage = "I'm taking longer than expected. Please try again.";
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'High demand right now. Please wait a moment and try again.';
    }

    onStream({
      type: 'error',
      data: { message: errorMessage },
    });
    onStream({ type: 'done' });
  }
};

/**
 * Simple non-streaming agent call for testing
 */
export const runAgentSimple = async (
  message: string,
  conversationHistory: ConversationMessage[],
  context: ChatContext,
  toolContext: ToolContext
): Promise<{ content: string; action?: { type: string; payload: any } }> => {
  return new Promise((resolve, reject) => {
    let content = '';
    let action: { type: string; payload: any } | undefined;

    runAgent(
      message,
      conversationHistory,
      context,
      toolContext,
      (event) => {
        if (event.type === 'content' && event.data?.delta) {
          content += event.data.delta;
        } else if (event.type === 'action') {
          action = event.data;
        } else if (event.type === 'error') {
          reject(new Error(event.data?.message || 'Agent error'));
        } else if (event.type === 'done') {
          resolve({ content, action });
        }
      }
    );
  });
};
