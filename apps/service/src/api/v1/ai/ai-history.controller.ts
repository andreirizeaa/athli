/**
 * AI Chat History Controller
 */

import { Request, Response } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import * as svc from '../../../services/ai-chat-history.service';
import { unauthorized, badRequest } from '../../../utils/http-response';

// ── Lightweight LLM for title generation ────────────────────────────

let titleLLM: ChatOpenAI | null = null;

function getTitleLLM() {
  if (titleLLM) return titleLLM;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');
  process.env.OPENAI_API_KEY = apiKey;
  titleLLM = new ChatOpenAI({
    modelName: 'google/gemini-2.0-flash-lite-001',
    openAIApiKey: apiKey,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://athli.app',
        'X-Title': 'Athli AI Title Gen',
      },
    },
    temperature: 0.3,
    maxTokens: 80,
  });
  return titleLLM;
}

// ── Handlers ────────────────────────────────────────────────────────

export const aiHistoryController = {
  /** GET /ai/chats */
  list: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'Not authenticated' });
    try {
      const chats = await svc.listChats(userId);
      res.json({ success: true, data: chats });
    } catch (err: any) {
      console.error('ai-history list error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /** POST /ai/chats */
  create: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'Not authenticated' });
    try {
      const chat = await svc.createChat(userId, req.body.title);
      res.status(201).json({ success: true, data: chat });
    } catch (err: any) {
      console.error('ai-history create error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /** GET /ai/chats/:id */
  get: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'Not authenticated' });
    try {
      const chat = await svc.getChat(req.params.id, userId);
      if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
      res.json({ success: true, data: chat });
    } catch (err: any) {
      console.error('ai-history get error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /** PUT /ai/chats/:id */
  update: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'Not authenticated' });
    const { title, data } = req.body;
    if (!title && !data) return badRequest(res, { message: 'Nothing to update' });
    try {
      const updates: any = {};
      if (title) updates.title = title;
      if (data) updates.data = data;
      const chat = await svc.updateChat(req.params.id, userId, updates);
      res.json({ success: true, data: chat });
    } catch (err: any) {
      console.error('ai-history update error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /** DELETE /ai/chats/:id */
  remove: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'Not authenticated' });
    try {
      await svc.deleteChat(req.params.id, userId);
      res.json({ success: true });
    } catch (err: any) {
      console.error('ai-history delete error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /** POST /ai/chats/:id/messages */
  appendMessage: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'Not authenticated' });
    const { role, content, toolCalls, action } = req.body;
    if (!role || !content) return badRequest(res, { message: 'role and content required' });
    try {
      const chat = await svc.appendMessage(req.params.id, userId, {
        role,
        content,
        timestamp: new Date().toISOString(),
        toolCalls,
        action,
      });
      res.json({ success: true, data: chat });
    } catch (err: any) {
      console.error('ai-history appendMessage error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /ai/summarize-title
   * Body: { message: string }
   * Returns: { title: string }
   *
   * Uses a fast, cheap model to generate a 50-60 char summary title
   * from the user's first message in a chat.
   */
  summarizeTitle: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'Not authenticated' });
    const { message } = req.body;
    if (!message) return badRequest(res, { message: 'message is required' });

    try {
      const llm = getTitleLLM();
      const result = await llm.invoke([
        new SystemMessage(
          'You are a title generator. Given the user\'s message, produce a short summary title for the conversation. ' +
          'Rules: 50-60 characters max, no quotes, no colons, no emojis. Just a clear, natural title. ' +
          'Reply with ONLY the title text, nothing else.',
        ),
        new HumanMessage(message),
      ]);
      const title = (typeof result.content === 'string' ? result.content : '').trim().slice(0, 60);
      res.json({ success: true, data: { title: title || message.slice(0, 55) + '…' } });
    } catch (err: any) {
      console.error('summarize-title error:', err);
      // Fallback: truncate the message
      const fallback = message.slice(0, 55) + (message.length > 55 ? '…' : '');
      res.json({ success: true, data: { title: fallback } });
    }
  },
};
