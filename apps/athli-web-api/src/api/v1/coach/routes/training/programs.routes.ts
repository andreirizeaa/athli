import { Router } from 'express';

import { coachProgramsController } from '../../coach-programs.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const coachProgramRouter = Router();

/**
 * @swagger
 * /api/v1/coach/training/programs:
 *   get:
 *     summary: Get coach programs
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach programs retrieved successfully
 */
coachProgramRouter.get('/', supabaseAuthenticate, coachProgramsController.getPrograms);

/**
 * @swagger
 * /api/v1/coach/training/programs/{id}:
 *   get:
 *     summary: Get coach program by ID
 *     tags: [Coach]
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
 *       404:
 *         description: Program not found
 */
coachProgramRouter.get('/:id', supabaseAuthenticate, coachProgramsController.getProgramById);

/**
 * @swagger
 * /api/v1/coach/training/programs:
 *   post:
 *     summary: Create coach program
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Coach program created successfully
 *
 * /api/v1/coach/training/programs/{id}:
 *   patch:
 *     summary: Update coach program
 *     tags: [Coach]
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
 *     responses:
 *       200:
 *         description: Coach program updated successfully
 *   delete:
 *     summary: Delete coach program
 *     tags: [Coach]
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
 */
coachProgramRouter.post('/', supabaseAuthenticate, coachProgramsController.createProgram);

coachProgramRouter.patch('/:id', supabaseAuthenticate, coachProgramsController.updateProgram);

coachProgramRouter.delete('/:id', supabaseAuthenticate, coachProgramsController.deleteProgram);

coachProgramRouter.post('/:id/duplicate', supabaseAuthenticate, coachProgramsController.duplicateProgram);
