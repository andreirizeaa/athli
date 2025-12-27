import { Router } from 'express';
import { clientMetricsController } from '../client-metrics.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const clientMetricRouter = Router();

/**
 * @swagger
 * /api/v1/client/metrics:
 *   get:
 *     summary: Get client metrics
 *     tags: [Client Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client metrics retrieved successfully
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
 *                         assignments:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ClientMetric'
 */
clientMetricRouter.get('/', supabaseAuthenticate, clientMetricsController.getMetrics);

/**
 * @swagger
 * /api/v1/client/metrics/{id}:
 *   post:
 *     summary: Record client metric value
 *     tags: [Client Metrics]
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
 *             required: [value]
 *             properties:
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client metric recorded successfully
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
 *                         assignment:
 *                           $ref: '#/components/schemas/ClientMetric'
 */
clientMetricRouter.post('/:id', supabaseAuthenticate, clientMetricsController.recordMetric);
