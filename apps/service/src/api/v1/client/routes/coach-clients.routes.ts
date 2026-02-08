import { Router } from 'express';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';
import { coachClientController } from '../coach-clients.controller';
import { clientDetailsController } from '../client-details.controller';
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
coachClientRouter.get('/detail', supabaseAuthenticate, coachClientController.getClient);
coachClientRouter.delete('/', supabaseAuthenticate, coachClientController.deleteClient);

/**
 * @swagger
 * /api/v1/clients:
 *   patch:
 *     summary: Update client status/details
 *     tags: [Coach Clients]
 */
coachClientRouter.patch('/', supabaseAuthenticate, upload.single('avatar'), coachClientController.updateClient);

/**
 * Bio, Goals, Injuries routes
 */
coachClientRouter.get('/bio', supabaseAuthenticate, clientDetailsController.getBio);
coachClientRouter.patch('/bio', supabaseAuthenticate, clientDetailsController.updateBio);
coachClientRouter.get('/goals', supabaseAuthenticate, clientDetailsController.getGoals);
coachClientRouter.post('/goals', supabaseAuthenticate, clientDetailsController.createGoal);
coachClientRouter.patch('/goals/:id', supabaseAuthenticate, clientDetailsController.updateGoal);
coachClientRouter.delete('/goals/:id', supabaseAuthenticate, clientDetailsController.deleteGoal);
coachClientRouter.get('/injuries', supabaseAuthenticate, clientDetailsController.getInjuries);
coachClientRouter.post('/injuries', supabaseAuthenticate, clientDetailsController.createInjury);
coachClientRouter.patch('/injuries/:id', supabaseAuthenticate, clientDetailsController.updateInjury);
coachClientRouter.delete('/injuries/:id', supabaseAuthenticate, clientDetailsController.deleteInjury);

/**
 * @swagger
 * /api/v1/clients/at-risk:
 *   post:
 *     summary: Get at-risk clients (inactive for more than threshold days)
 *     tags: [Coach Clients]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               thresholdDays:
 *                 type: number
 *                 default: 5
 */
coachClientRouter.post('/at-risk', supabaseAuthenticate, coachClientController.getAtRiskClients);

/**
 * @swagger
 * /api/v1/clients/training-history:
 *   post:
 *     summary: Get training history for all coach's clients
 *     tags: [Coach Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [completed, in_progress, missed]
 */
coachClientRouter.post('/training-history', supabaseAuthenticate, coachClientController.getTrainingHistory);

