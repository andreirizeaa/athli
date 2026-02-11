import { Router } from 'express';
import { coachMetricsController } from '../coach-metrics.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const coachMetricRouter = Router();

// =============================================================================
// Folder Routes (must come before :id routes)
// =============================================================================

/**
 * @swagger
 * /api/v1/coach/metrics/folders:
 *   get:
 *     summary: Get metric folders
 *     tags: [Coach Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metric folders retrieved successfully
 */
coachMetricRouter.get('/folders', supabaseAuthenticate, coachMetricsController.getFolders);

/**
 * @swagger
 * /api/v1/coach/metrics/folders:
 *   post:
 *     summary: Create metric folder
 *     tags: [Coach Metrics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Metric folder created successfully
 */
coachMetricRouter.post('/folders', supabaseAuthenticate, coachMetricsController.createFolder);

/**
 * @swagger
 * /api/v1/coach/metrics/folders/{id}:
 *   patch:
 *     summary: Update metric folder
 *     tags: [Coach Metrics]
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
 *         description: Metric folder updated successfully
 */
coachMetricRouter.patch('/folders/:id', supabaseAuthenticate, coachMetricsController.updateFolder);

/**
 * @swagger
 * /api/v1/coach/metrics/folders/{id}:
 *   delete:
 *     summary: Delete metric folder
 *     tags: [Coach Metrics]
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
 *         description: Metric folder deleted successfully
 */
coachMetricRouter.delete('/folders/:id', supabaseAuthenticate, coachMetricsController.deleteFolder);

/**
 * @swagger
 * /api/v1/coach/metrics/folders/{id}/metrics:
 *   get:
 *     summary: Get metrics in folder
 *     tags: [Coach Metrics]
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
 *         description: Metrics in folder retrieved successfully
 */
coachMetricRouter.get('/folders/:id/metrics', supabaseAuthenticate, coachMetricsController.getMetricsInFolder);

// =============================================================================
// Metric Routes
// =============================================================================

/**
 * @swagger
 * /api/v1/coach/metrics:
 *   get:
 *     summary: Get coach metrics
 *     tags: [Coach Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach metrics retrieved successfully
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
 *                         metrics:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CoachMetric'
 */
coachMetricRouter.get('/', supabaseAuthenticate, coachMetricsController.getMetrics);

/**
 * @swagger
 * /api/v1/coach/metrics:
 *   post:
 *     summary: Create coach metric
 *     tags: [Coach Metrics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCoachMetricInput'
 *     responses:
 *       201:
 *         description: Coach metric created successfully
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
 *                         metric:
 *                           $ref: '#/components/schemas/CoachMetric'
 */
coachMetricRouter.post('/', supabaseAuthenticate, coachMetricsController.createMetric);

/**
 * @swagger
 * /api/v1/coach/metrics/{id}/duplicate:
 *   post:
 *     summary: Duplicate coach metric
 *     tags: [Coach Metrics]
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
 *         description: Coach metric duplicated successfully
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
 *                         metric:
 *                           $ref: '#/components/schemas/CoachMetric'
 */
coachMetricRouter.post('/:id/duplicate', supabaseAuthenticate, coachMetricsController.duplicateMetric);

/**
 * @swagger
 * /api/v1/coach/metrics/{id}/move:
 *   patch:
 *     summary: Move metric to folder
 *     tags: [Coach Metrics]
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
 *               folder_id:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Metric moved successfully
 */
coachMetricRouter.patch('/:id/move', supabaseAuthenticate, coachMetricsController.moveMetric);

/**
 * @swagger
 * /api/v1/coach/metrics/{id}:
 *   patch:
 *     summary: Update coach metric
 *     tags: [Coach Metrics]
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
 *             $ref: '#/components/schemas/UpdateCoachMetricInput'
 *     responses:
 *       200:
 *         description: Coach metric updated successfully
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
 *                         metric:
 *                           $ref: '#/components/schemas/CoachMetric'
 */
coachMetricRouter.patch('/:id', supabaseAuthenticate, coachMetricsController.updateMetric);

/**
 * @swagger
 * /api/v1/coach/metrics/{id}:
 *   delete:
 *     summary: Delete coach metric
 *     tags: [Coach Metrics]
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
 *         description: Coach metric deleted successfully
 */
coachMetricRouter.delete('/:id', supabaseAuthenticate, coachMetricsController.deleteMetric);
