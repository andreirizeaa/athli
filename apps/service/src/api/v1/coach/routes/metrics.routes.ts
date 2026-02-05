import { Router } from 'express';
import { coachMetricsController } from '../coach-metrics.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const coachMetricRouter = Router();

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
