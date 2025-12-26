import { Router } from 'express';

export const clientHabitRouter = Router();

/**
 * @swagger
 * /api/v1/client/habits:
 *   get:
 *     summary: Get client habits
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client habits retrieved successfully
 */
clientHabitRouter.get('/', (req, res) => {
    res.json({ message: 'Client habits route' });
});

/**
 * @swagger
 * /api/v1/client/habits/{id}:
 *   patch:
 *     summary: Update client habit
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
 *         description: Client habit updated successfully
 */
clientHabitRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Client habit updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/client/habits:
 *   post:
 *     summary: Create client habit
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
 *         description: Client habit created successfully
 *
 * /api/v1/client/habits/{id}:
 *   delete:
 *     summary: Delete client habit
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
 *         description: Client habit deleted successfully
 */
clientHabitRouter.post('/', (req, res) => {
    res.json({ message: 'Client habit created' });
});

clientHabitRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Client habit deleted', id: req.params.id });
});
