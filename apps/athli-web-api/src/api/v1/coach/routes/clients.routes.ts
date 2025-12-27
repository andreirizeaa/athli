import { Router } from 'express';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';
import { coachClientController } from '../coach-clients.controller';

export const coachClientRouter = Router();

/**
 * @swagger
 * /api/v1/coach/clients:
 *   get:
 *     summary: Get all clients for the authenticated coach
 *     tags: [Coach Clients]
 */
coachClientRouter.get('/', supabaseAuthenticate, coachClientController.getClients);
coachClientRouter.get('/:id', supabaseAuthenticate, coachClientController.getClient);

/**
 * @swagger
 * /api/v1/coach/clients/new:
 *   post:
 *     summary: Create/Invite new clients
 *     tags: [Coach Clients]
 */
coachClientRouter.post('/new', supabaseAuthenticate, coachClientController.createClients);

/**
 * @swagger
 * /api/v1/coach/clients/{id}:
 *   patch:
 *     summary: Update client status/details
 *     tags: [Coach Clients]
 *   delete:
 *     summary: Remove client from coach
 *     tags: [Coach Clients]
 */
coachClientRouter.patch('/:id', supabaseAuthenticate, coachClientController.updateClient);
coachClientRouter.delete('/:id', supabaseAuthenticate, coachClientController.deleteClient);

/**
 * @swagger
 * /api/v1/coach/clients/archived:
 *   get:
 *     summary: Get all archived clients for the authenticated coach
 *     tags: [Coach Clients]
 */
coachClientRouter.get('/archived', supabaseAuthenticate, coachClientController.getArchivedClients);

/**
 * @swagger
 * /api/v1/coach/clients/{id}/restore:
 *   post:
 *     summary: Restore an archived client
 *     tags: [Coach Clients]
 */
coachClientRouter.post('/:id/restore', supabaseAuthenticate, coachClientController.restoreClient);
