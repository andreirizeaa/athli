/**
 * AI Routes
 */

import { Router } from 'express';
import { aiController } from './ai.controller';
import { aiHistoryController } from './ai-history.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const aiRouter = Router();

// Health check (no auth required)
aiRouter.get('/health', aiController.health);

// Chat endpoint with SSE streaming (auth required)
aiRouter.post('/chat', supabaseAuthenticate, aiController.chat);

// Execute confirmed action (auth required)
aiRouter.post('/execute', supabaseAuthenticate, aiController.execute);

// ── Chat history CRUD ──────────────────────────────────────────────
aiRouter.get('/chats', supabaseAuthenticate, aiHistoryController.listChats);
aiRouter.post('/chats', supabaseAuthenticate, aiHistoryController.createChat);
aiRouter.get('/chats/:id', supabaseAuthenticate, aiHistoryController.getChat);
aiRouter.put('/chats/:id', supabaseAuthenticate, aiHistoryController.updateChat);
aiRouter.delete('/chats/:id', supabaseAuthenticate, aiHistoryController.deleteChat);
aiRouter.post('/chats/:id/messages', supabaseAuthenticate, aiHistoryController.appendMessage);
