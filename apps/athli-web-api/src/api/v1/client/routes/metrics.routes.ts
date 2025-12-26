import { Router } from 'express';

export const clientMetricRouter = Router();

/**
 * @swagger
 * /api/v1/client/metrics:
 *   get:
 *     summary: Get client metrics
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client metrics retrieved successfully
 */
clientMetricRouter.get('/', (req, res) => {
    res.json({ message: 'Client metrics route' });
});

/**
 * @swagger
 * /api/v1/client/metrics/{id}:
 *   patch:
 *     summary: Update client metric
 *     tags: [Client]
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
 *         description: Client metric updated successfully
 */
clientMetricRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Client metric updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/client/metrics:
 *   post:
 *     summary: Create client metric
 *     tags: [Client]
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
 *         description: Client metric created successfully
 *
 * /api/v1/client/metrics/{id}:
 *   delete:
 *     summary: Delete client metric
 *     tags: [Client]
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
 *         description: Client metric deleted successfully
 */
clientMetricRouter.post('/', (req, res) => {
    res.json({ message: 'Client metric created' });
});

clientMetricRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Client metric deleted', id: req.params.id });
});
