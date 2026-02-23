/**
 * AI Controller - Handles AI chat endpoints with SSE streaming
 */

import { Request, Response } from 'express';
import { runAgent, ConversationMessage, ChatContext, StreamEvent } from '../../../services/ai/langgraph-agent';
import { ToolContext } from './tools';
import { unauthorized, badRequest } from '../../../utils/http-response';
import { fetchStartupContext, formatStartupContext } from '../../../services/ai/startup-context';

/**
 * Chat endpoint with Server-Sent Events streaming
 * POST /api/v1/ai/chat
 */
export const aiController = {
  chat: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { message, sessionId, context, conversationHistory } = req.body;

    if (!message || typeof message !== 'string') {
      badRequest(res, { message: 'message is required' });
      return;
    }

    // ── Input sanitization ───────────────────────────────────────────
    // 1. Enforce length limit (10k chars is generous for a chat message)
    if (message.length > 10_000) {
      badRequest(res, { message: 'Message too long (max 10,000 characters)' });
      return;
    }

    // 2. Strip control characters (keep newlines/tabs for formatting)
    const sanitizedMessage = message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

    if (!sanitizedMessage) {
      badRequest(res, { message: 'Message is empty after sanitization' });
      return;
    }

    // 3. Validate conversationHistory size to prevent context-stuffing
    const maxHistoryMessages = 50;
    const maxHistoryMessageLength = 10_000;
    const validatedHistory = Array.isArray(conversationHistory)
      ? conversationHistory
          .slice(-maxHistoryMessages)
          .filter((msg: any) => msg.role && msg.content && typeof msg.content === 'string')
          .map((msg: any) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content.slice(0, maxHistoryMessageLength),
          }))
      : [];

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Helper to send SSE events with immediate flush
    const sendEvent = (event: StreamEvent) => {
      const eventType = event.type;
      const data = event.data ? JSON.stringify(event.data) : '{}';
      res.write(`event: ${eventType}\ndata: ${data}\n\n`);
      // Flush to ensure immediate delivery
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    };

    // Use validated history from sanitization above
    const history: ConversationMessage[] = validatedHistory;

    // Parse context
    const chatContext: ChatContext = {
      currentPage: context?.currentPage,
    };

    // Fetch startup context (clients, workouts) to inject into prompt
    // This eliminates tool calls for basic data lookup
    let startupContextStr: string | undefined;
    try {
      const startupContext = await fetchStartupContext(userId);
      startupContextStr = formatStartupContext(startupContext);
    } catch (err) {
      console.error('Failed to fetch startup context:', err);
      // Continue without startup context - AI will use tools instead
    }

    // Tool context includes coach ID and pre-loaded data
    const toolContext: ToolContext = {
      coachId: userId,
      startupContext: startupContextStr,
    };

    try {
      // Run the agent with streaming
      await runAgent(sanitizedMessage, history, chatContext, toolContext, sendEvent);
    } catch (error: any) {
      console.error('AI chat error:', error);
      sendEvent({
        type: 'error',
        data: { message: 'An error occurred while processing your request.' },
      });
      sendEvent({ type: 'done' });
    }

    // Close the connection
    res.end();
  },

  /**
   * Execute a confirmed action
   * POST /api/v1/ai/execute
   */
  execute: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { actionType, payload } = req.body;

    if (!actionType || !payload) {
      badRequest(res, { message: 'actionType and payload are required' });
      return;
    }

    // Note: The PRD specifies that the frontend handles saving via existing APIs
    // This endpoint is reserved for future use if server-side execution is needed
    res.json({
      success: true,
      message: 'Action execution is handled by the frontend',
      data: {
        actionType,
        redirectUrl: getRedirectUrl(actionType),
      },
    });
  },

  /**
   * Health check endpoint for AI service
   * GET /api/v1/ai/health
   */
  health: async (req: Request, res: Response) => {
    const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
    const hasLangSmithKey = !!process.env.LANGCHAIN_API_KEY;

    res.json({
      success: true,
      data: {
        status: hasOpenRouterKey ? 'ready' : 'missing_api_key',
        openRouterConfigured: hasOpenRouterKey,
        langSmithConfigured: hasLangSmithKey,
        tracingEnabled: process.env.LANGCHAIN_TRACING_V2 === 'true',
      },
    });
  },
};

/**
 * Get redirect URL based on action type
 */
function getRedirectUrl(actionType: string): string {
  switch (actionType) {
    case 'create_workout':
      return '/training/workouts';
    case 'create_program':
      return '/training/programs';
    case 'create_section':
      return '/training/sections';
    default:
      return '/training/workouts';
  }
}
