import { Router } from 'express';

export const coachMetricRouter = Router();

/**
 * @swagger
 * /api/v1/coach/metrics:
 *   get:
 *     summary: Get coach metrics
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach metrics retrieved successfully
 */
coachMetricRouter.get('/', (req, res) => {
    res.json({ message: 'Coach metrics route' });
});

/**
 * @swagger
 * /api/v1/coach/metrics/{id}:
 *   patch:
 *     summary: Update coach metric
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
 *         description: Coach metric updated successfully
 */
coachMetricRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Coach metric updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/coach/metrics:
 *   post:
 *     summary: Create coach metric
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
 *         description: Coach metric created successfully
 *
 * /api/v1/coach/metrics/{id}:
 *   delete:
 *     summary: Delete coach metric
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
 *         description: Coach metric deleted successfully
 */
coachMetricRouter.post('/', (req, res) => {
    res.json({ message: 'Coach metric created' });
});

coachMetricRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Coach metric deleted', id: req.params.id });
});
