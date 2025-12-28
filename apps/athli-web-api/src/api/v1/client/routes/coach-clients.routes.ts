import { Router } from 'express';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';
import { coachClientController } from '../coach-clients.controller';
import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});

export const coachClientRouter = Router();

/**
 * @swagger
 * /api/v1/clients:
 *   get:
 *     summary: Get all clients for the authenticated coach
 *     tags: [Coach Clients]
 */
coachClientRouter.get('/', supabaseAuthenticate, coachClientController.getClients);

/**
 * @swagger
 * /api/v1/clients/new:
 *   post:
 *     summary: Create/Invite new clients
 *     tags: [Coach Clients]
 */
coachClientRouter.post('/new', supabaseAuthenticate, coachClientController.createClients);

/**
 * @swagger
 * /api/v1/clients/archived:
 *   get:
 *     summary: Get all archived clients for the authenticated coach
 *     tags: [Coach Clients]
 */
coachClientRouter.get('/archived', supabaseAuthenticate, coachClientController.getArchivedClients);

/**
 * @swagger
 * /api/v1/clients/restore:
 *   post:
 *     summary: Restore an archived client
 *     tags: [Coach Clients]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema:
 *           type: string
 */
coachClientRouter.post('/restore', supabaseAuthenticate, coachClientController.restoreClient);

/**
 * @swagger
 * /api/v1/clients/resend-invite:
 *   post:
 *     summary: Resend invitation email to client
 *     tags: [Coach Clients]
 */
coachClientRouter.post('/resend-invite', supabaseAuthenticate, coachClientController.resendInvite);

/**
 * @swagger
 * /api/v1/clients/{id}:
 *   get:
 *     summary: Get a single client
 *     tags: [Coach Clients]
 *   delete:
 *     summary: Remove client from coach
 *     tags: [Coach Clients]
 */
coachClientRouter.get('/:id', supabaseAuthenticate, coachClientController.getClient);
coachClientRouter.delete('/', supabaseAuthenticate, coachClientController.deleteClient);

/**
 * @swagger
 * /api/v1/clients:
 *   patch:
 *     summary: Update client status/details
 *     tags: [Coach Clients]
 */
coachClientRouter.patch('/', supabaseAuthenticate, coachClientController.updateClient);
