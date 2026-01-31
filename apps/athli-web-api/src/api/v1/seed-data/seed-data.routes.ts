import { Router } from 'express';
import { seedDataController } from './seed-data.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const seedDataRouter = Router();

/**
 * @swagger
 * /api/v1/seed-data/add:
 *   post:
 *     summary: Add seed data for development testing
 *     tags: [Dev Studio]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seed data created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
seedDataRouter.post('/add', supabaseAuthenticate, seedDataController.addSeedData);

/**
 * @swagger
 * /api/v1/seed-data/remove:
 *   delete:
 *     summary: Remove seed data
 *     tags: [Dev Studio]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seed data removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
seedDataRouter.delete('/remove', supabaseAuthenticate, seedDataController.removeSeedData);
