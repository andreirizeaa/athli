import { Router } from 'express';

export const clientCheckInRouter = Router();

/**
 * @swagger
 * /api/v1/client/forms/check-ins:
 *   get:
 *     summary: Get client check-ins
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client check-ins retrieved successfully
 */
clientCheckInRouter.get('/', (req, res) => {
    res.json({ message: 'Client check-in route' });
});

/**
 * @swagger
 * /api/v1/client/forms/check-ins/{id}:
 *   patch:
 *     summary: Update client check-in
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
 *         description: Client check-in updated successfully
 */
clientCheckInRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Client check-in updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/client/forms/check-ins:
 *   post:
 *     summary: Create client check-in
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
 *         description: Client check-in created successfully
 *
 * /api/v1/client/forms/check-ins/{id}:
 *   delete:
 *     summary: Delete client check-in
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
 *         description: Client check-in deleted successfully
 */
clientCheckInRouter.post('/', (req, res) => {
    res.json({ message: 'Client check-in created' });
});

clientCheckInRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Client check-in deleted', id: req.params.id });
});
