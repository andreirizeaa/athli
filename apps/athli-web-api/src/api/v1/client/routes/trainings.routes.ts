import { Router } from 'express';

export const clientTrainingRouter = Router();

/**
 * @swagger
 * /api/v1/client/trainings:
 *   get:
 *     summary: Get client training
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client training retrieved successfully
 */
clientTrainingRouter.get('/', (req, res) => {
    res.json({ message: 'Client training route' });
});

/**
 * @swagger
 * /api/v1/client/trainings/{id}:
 *   patch:
 *     summary: Update client training
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
 *         description: Client training updated successfully
 */
clientTrainingRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Client training updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/client/trainings:
 *   post:
 *     summary: Create client training
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
 *         description: Client training created successfully
 *
 * /api/v1/client/trainings/{id}:
 *   delete:
 *     summary: Delete client training
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
 *         description: Client training deleted successfully
 */
clientTrainingRouter.post('/', (req, res) => {
    res.json({ message: 'Client training created' });
});

clientTrainingRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Client training deleted', id: req.params.id });
});
