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
 * /api/v1/client/habits:
 *   patch:
 *     summary: Log client habit (create log entry)
 *     tags: [Client Habits]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *   put:
 *     summary: Update habit assignment details
 *     tags: [Client Habits]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 */
clientHabitRouter.patch('/', supabaseAuthenticate, clientHabitsController.logHabit);
clientHabitRouter.put('/', supabaseAuthenticate, clientHabitsController.updateAssignment);

/**
 * @swagger
 * /api/v1/client/habits/logs:
 *   delete:
 *     summary: Delete habit log entry
 *     tags: [Client Habits]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *   patch:
 *     summary: Update habit log entry
 *     tags: [Client Habits]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 */
clientHabitRouter.delete('/logs', supabaseAuthenticate, clientHabitsController.deleteLog);
clientHabitRouter.patch('/logs', supabaseAuthenticate, clientHabitsController.updateLog);

/**
 * @swagger
 * /api/v1/client/habits/logs/check:
 *   post:
 *     summary: Check if a log exists for a specific date
 *     tags: [Client Habits]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 */
clientHabitRouter.post('/logs/check', supabaseAuthenticate, clientHabitsController.checkExistingLog);

/**
 * @swagger
 * /api/v1/client/habits/streaks:
 *   post:
 *     summary: Get habit streaks (longest all-time and current)
 *     tags: [Client Habits]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignmentId:
 *                 type: string
 *             required:
 *               - assignmentId
 */
clientHabitRouter.post('/streaks', supabaseAuthenticate, clientHabitsController.getStreaks);
