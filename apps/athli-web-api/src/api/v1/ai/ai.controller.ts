/**
 * AI Controller - Handles AI chat endpoints with SSE streaming
 */

import { Request, Response } from 'express';
import { runAgent, ConversationMessage, ChatContext, StreamEvent } from '../../../services/ai/langgraph-agent';
import { ToolContext } from './tools';
import { unauthorized, badRequest } from '../../../utils/http-response';

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

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Helper to send SSE events
    const sendEvent = (event: StreamEvent) => {
      const eventType = event.type;
      const data = event.data ? JSON.stringify(event.data) : '{}';
      res.write(`event: ${eventType}\ndata: ${data}\n\n`);
    };

    // Parse conversation history
    const history: ConversationMessage[] = Array.isArray(conversationHistory)
      ? conversationHistory
          .filter((msg: any) => msg.role && msg.content)
          .map((msg: any) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }))
      : [];

    // Parse context
    const chatContext: ChatContext = {
      currentPage: context?.currentPage,
    };

    // Tool context includes coach ID
    const toolContext: ToolContext = {
      coachId: userId,
    };

    try {
      // Run the agent with streaming
      await runAgent(message, history, chatContext, toolContext, sendEvent);
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
