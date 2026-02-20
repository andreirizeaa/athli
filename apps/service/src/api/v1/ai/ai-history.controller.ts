/**
 * AI History Controller - CRUD endpoints for AI chat history
 */

import { Request, Response } from 'express';
import {
  createChat,
  getChats,
  getChatById,
  updateChat,
  deleteChat,
  appendMessage,
} from '../../../services/ai-chat-history.service';
import { unauthorized, badRequest } from '../../../utils/http-response';

export const aiHistoryController = {
  /**
   * GET /api/v1/ai/chats
   */
  listChats: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'User not authenticated' });

    try {
      const chats = await getChats(userId);
      res.json({ success: true, data: chats });
    } catch (err: any) {
      console.error('listChats error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /api/v1/ai/chats
   */
  createChat: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'User not authenticated' });

    const { title } = req.body;

    try {
      const chat = await createChat(userId, title);
      res.status(201).json({ success: true, data: chat });
    } catch (err: any) {
      console.error('createChat error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * GET /api/v1/ai/chats/:id
   */
  getChat: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'User not authenticated' });

    const { id } = req.params;
    if (!id) return badRequest(res, { message: 'Chat ID is required' });

    try {
      const chat = await getChatById(id, userId);
      if (!chat) {
        return res.status(404).json({ success: false, message: 'Chat not found' });
      }
      res.json({ success: true, data: chat });
    } catch (err: any) {
      console.error('getChat error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * PUT /api/v1/ai/chats/:id
   */
  updateChat: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'User not authenticated' });

    const { id } = req.params;
    if (!id) return badRequest(res, { message: 'Chat ID is required' });

    const { title, data } = req.body;
    if (!title && !data) return badRequest(res, { message: 'Nothing to update' });

    try {
      const updates: any = {};
      if (title) updates.title = title;
      if (data) updates.data = data;

      const chat = await updateChat(id, userId, updates);
      res.json({ success: true, data: chat });
    } catch (err: any) {
      console.error('updateChat error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * DELETE /api/v1/ai/chats/:id
   */
  deleteChat: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'User not authenticated' });

    const { id } = req.params;
    if (!id) return badRequest(res, { message: 'Chat ID is required' });

    try {
      await deleteChat(id, userId);
      res.json({ success: true, message: 'Chat deleted' });
    } catch (err: any) {
      console.error('deleteChat error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /api/v1/ai/chats/:id/messages
   */
  appendMessage: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return unauthorized(res, { message: 'User not authenticated' });

    const { id } = req.params;
    if (!id) return badRequest(res, { message: 'Chat ID is required' });

    const { role, content, toolCalls, action } = req.body;
    if (!role || !content) return badRequest(res, { message: 'role and content are required' });

    try {
      const chat = await appendMessage(id, userId, {
        role,
        content,
        timestamp: new Date().toISOString(),
        toolCalls,
        action,
      });
      res.json({ success: true, data: chat });
    } catch (err: any) {
      console.error('appendMessage error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
