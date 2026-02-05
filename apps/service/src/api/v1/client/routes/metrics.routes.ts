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
 * /api/v1/client/metrics:
 *   patch:
 *     summary: Log client metric (create log entry)
 *     tags: [Client Metrics]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *   put:
 *     summary: Update metric assignment details
 *     tags: [Client Metrics]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 */
clientMetricRouter.patch('/', supabaseAuthenticate, clientMetricsController.logMetric);
clientMetricRouter.put('/', supabaseAuthenticate, clientMetricsController.updateAssignment);

/**
 * @swagger
 * /api/v1/client/metrics/logs:
 *   delete:
 *     summary: Delete metric log entry
 *     tags: [Client Metrics]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *   patch:
 *     summary: Update metric log entry
 *     tags: [Client Metrics]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 */
clientMetricRouter.delete('/logs', supabaseAuthenticate, clientMetricsController.deleteLog);
clientMetricRouter.patch('/logs', supabaseAuthenticate, clientMetricsController.updateLog);

/**
 * @swagger
 * /api/v1/client/metrics/logs/check:
 *   post:
 *     summary: Check if a log exists for a specific date
 *     tags: [Client Metrics]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 */
clientMetricRouter.post('/logs/check', supabaseAuthenticate, clientMetricsController.checkExistingLog);
