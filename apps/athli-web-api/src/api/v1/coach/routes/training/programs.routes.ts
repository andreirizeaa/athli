import { Router } from 'express';

import { coachProgramsController } from '../../coach-programs.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const coachProgramRouter = Router();

/**
 * @swagger
 * /api/v1/coach/training/programs:
 *   get:
 *     summary: Get coach programs
 *     tags: [Coach Training]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach programs retrieved successfully
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
 *                         programs:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CoachProgram'
 */
coachProgramRouter.get('/', supabaseAuthenticate, coachProgramsController.getPrograms);

/**
 * @swagger
 * /api/v1/coach/training/programs/{id}:
 *   get:
 *     summary: Get coach program by ID
 *     tags: [Coach Training]
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
 *         description: Coach program retrieved successfully
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
 *                         program:
 *                           $ref: '#/components/schemas/CoachProgram'
 *       404:
 *         description: Program not found
 */
coachProgramRouter.get('/:id', supabaseAuthenticate, coachProgramsController.getProgramById);

/**
 * @swagger
 * /api/v1/coach/training/programs:
 *   post:
 *     summary: Create coach program
 *     tags: [Coach Training]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCoachProgramInput'
 *     responses:
 *       201:
 *         description: Coach program created successfully
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
 *                         program:
 *                           $ref: '#/components/schemas/CoachProgram'
 *
 * /api/v1/coach/training/programs/{id}:
 *   patch:
 *     summary: Update coach program
 *     tags: [Coach Training]
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
 *             type: object
 *             properties:
 *               name: { type: 'string' }
 *               description: { type: 'string' }
 *               program_data: { type: 'object' }
 *     responses:
 *       200:
 *         description: Coach program updated successfully
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
 *                         program:
 *                           $ref: '#/components/schemas/CoachProgram'
 *   delete:
 *     summary: Delete coach program
 *     tags: [Coach Training]
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
 *         description: Coach program deleted successfully
 *
 * /api/v1/coach/training/programs/{id}/duplicate:
 *   post:
 *     summary: Duplicate coach program
 *     tags: [Coach Training]
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
 *         description: Coach program duplicated successfully
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
 *                         program:
 *                           $ref: '#/components/schemas/CoachProgram'
 */
coachProgramRouter.post('/', supabaseAuthenticate, coachProgramsController.createProgram);

coachProgramRouter.patch('/:id', supabaseAuthenticate, coachProgramsController.updateProgram);

coachProgramRouter.delete('/:id', supabaseAuthenticate, coachProgramsController.deleteProgram);

coachProgramRouter.post('/:id/duplicate', supabaseAuthenticate, coachProgramsController.duplicateProgram);
