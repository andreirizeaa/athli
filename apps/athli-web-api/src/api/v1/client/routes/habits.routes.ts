import { Router } from 'express';
import { clientHabitsController } from '../client-habits.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const clientHabitRouter = Router();

/**
 * @swagger
 * /api/v1/client/habits:
 *   get:
 *     summary: Get client habits
 *     tags: [Client Habits]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 *   post:
 *     summary: Assign habits to client (Coach only)
 *     tags: [Client Habits]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *   delete:
 *     summary: Remove habits from client (Coach only)
 *     tags: [Client Habits]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 */
clientHabitRouter.get('/', supabaseAuthenticate, clientHabitsController.getHabits);
clientHabitRouter.post('/', supabaseAuthenticate, clientHabitsController.assignHabit);
clientHabitRouter.delete('/', supabaseAuthenticate, clientHabitsController.deleteAssignment);

/**
 * @swagger
 * /api/v1/client/habits/{id}:
 *   patch:
 *     summary: Update client habit status
 *     tags: [Client Habits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 */
clientHabitRouter.patch('/:id', supabaseAuthenticate, clientHabitsController.updateHabitStatus);
