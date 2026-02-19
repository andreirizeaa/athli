/**
 * AI Routes
 */

import { Router } from 'express';
import { aiController } from './ai.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const aiRouter = Router();

// Health check (no auth required)
aiRouter.get('/health', aiController.health);

// Chat endpoint with SSE streaming (auth required)
aiRouter.post('/chat', supabaseAuthenticate, aiController.chat);

// Execute confirmed action (auth required)
aiRouter.post('/execute', supabaseAuthenticate, aiController.execute);
