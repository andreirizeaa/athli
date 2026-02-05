import { Router } from 'express';
import { coachPublicController } from '../coach-public.controller';

export const coachCodeRouter = Router();

/**
 * @swagger
 * /api/v1/coach/by-code/{code}:
 *   get:
 *     summary: Get coach profile by unique code (Public)
 *     tags: [Coach Code]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coach profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CoachCode'
 *       404:
 *         description: Invalid code
 */
coachCodeRouter.get('/by-code/:code', coachPublicController.getCoachByCode);

/**
 * @swagger
 * /api/v1/coach/code-by-id/{coachId}:
 *   get:
 *     summary: Get coach unique code by coach ID (Public)
 *     tags: [Coach Code]
 *     parameters:
 *       - in: path
 *         name: coachId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coach code retrieved successfully
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
 *                         code:
 *                           type: string
 */
coachCodeRouter.get('/code-by-id/:coachId', coachPublicController.getCoachCodeById);
