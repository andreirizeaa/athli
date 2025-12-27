import { Router } from 'express';
import { coachFlowController } from '../coach-flows.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const coachFlowRouter = Router();

/**
 * @swagger
 * /api/v1/coach/flows:
 *   get:
 *     summary: Get coach flows
 *     tags: [Coach Flows]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach flows retrieved successfully
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
 *                         flows:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CoachFlow'
 */
coachFlowRouter.get('/', supabaseAuthenticate, coachFlowController.getFlows);

/**
 * @swagger
 * /api/v1/coach/flows/{id}:
 *   get:
 *     summary: Get a single coach flow by ID
 *     tags: [Coach Flows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Coach flow retrieved successfully
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
 *                         flow:
 *                           $ref: '#/components/schemas/CoachFlow'
 */
coachFlowRouter.get('/:id', supabaseAuthenticate, coachFlowController.getFlowById);

/**
 * @swagger
 * /api/v1/coach/flows/{id}:
 *   patch:
 *     summary: Update coach flow
 *     tags: [Coach Flows]
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
 *             $ref: '#/components/schemas/CreateCoachFlowInput'
 *     responses:
 *       200:
 *         description: Coach flow updated successfully
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
 *                         flow:
 *                           $ref: '#/components/schemas/CoachFlow'
 */
coachFlowRouter.patch('/:id', supabaseAuthenticate, coachFlowController.updateFlow);

/**
 * @swagger
 * /api/v1/coach/flows:
 *   post:
 *     summary: Create coach flow
 *     tags: [Coach Flows]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCoachFlowInput'
 *     responses:
 *       201:
 *         description: Coach flow created successfully
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
 *                         flow:
 *                           $ref: '#/components/schemas/CoachFlow'
 *
 * /api/v1/coach/flows/{id}:
 *   delete:
 *     summary: Delete coach flow
 *     tags: [Coach Flows]
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
 *         description: Coach flow deleted successfully
 */
coachFlowRouter.post('/', supabaseAuthenticate, coachFlowController.createFlow);

coachFlowRouter.delete('/:id', supabaseAuthenticate, coachFlowController.deleteFlow);
