import { Router } from 'express';
import { coachHabitsController } from '../coach-habits.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const coachHabitRouter = Router();

/**
 * @swagger
 * /api/v1/coach/habits:
 *   get:
 *     summary: Get coach habits
 *     description: Retrieve all habits created by the authenticated coach.
 *     tags: [Coach Habits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach habits retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         habits:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CoachHabit'
 */
coachHabitRouter.get('/', supabaseAuthenticate, coachHabitsController.getHabits);

/**
 * @swagger
 * /api/v1/coach/habits:
 *   post:
 *     summary: Create coach habit
 *     description: Create a new custom habit in the coach's library.
 *     tags: [Coach Habits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCoachHabitInput'
 *     responses:
 *       201:
 *         description: Coach habit created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         habit:
 *                           $ref: '#/components/schemas/CoachHabit'
 */
coachHabitRouter.post('/', supabaseAuthenticate, coachHabitsController.createHabit);

/**
 * @swagger
 * /api/v1/coach/habits/{id}:
 *   patch:
 *     summary: Update coach habit
 *     description: Update an existing habit in the coach's library.
 *     tags: [Coach Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCoachHabitInput'
 *     responses:
 *       200:
 *         description: Coach habit updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         habit:
 *                           $ref: '#/components/schemas/CoachHabit'
 */
coachHabitRouter.patch('/:id', supabaseAuthenticate, coachHabitsController.updateHabit);

/**
 * @swagger
 * /api/v1/coach/habits/{id}:
 *   delete:
 *     summary: Delete coach habit
 *     description: Remove a habit from the coach's library.
 *     tags: [Coach Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coach habit deleted successfully
 */
coachHabitRouter.delete('/:id', supabaseAuthenticate, coachHabitsController.deleteHabit);

/**
 * @swagger
 * /api/v1/coach/habits/{id}/duplicate:
 *   post:
 *     summary: Duplicate coach habit
 *     description: Create a copy of an existing habit with "(Copy)" appended to the name.
 *     tags: [Coach Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Coach habit duplicated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         habit:
 *                           $ref: '#/components/schemas/CoachHabit'
 */
coachHabitRouter.post('/:id/duplicate', supabaseAuthenticate, coachHabitsController.duplicateHabit);
