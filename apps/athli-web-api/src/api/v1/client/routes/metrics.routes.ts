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
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 *   post:
 *     summary: Assign metrics to client (Coach only)
 *     tags: [Client Metrics]
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
 *     summary: Remove metrics from client (Coach only)
 *     tags: [Client Metrics]
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
clientMetricRouter.get('/', supabaseAuthenticate, clientMetricsController.getMetrics);
clientMetricRouter.post('/', supabaseAuthenticate, clientMetricsController.assignMetric);
clientMetricRouter.delete('/', supabaseAuthenticate, clientMetricsController.deleteAssignment);

/**
 * @swagger
 * /api/v1/client/metrics/{id}:
 *   post:
 *     summary: Record client metric value
 *     tags: [Client Metrics]
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
clientMetricRouter.post('/:id', supabaseAuthenticate, clientMetricsController.recordMetric);
