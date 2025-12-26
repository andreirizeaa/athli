import { Router } from 'express';

export const coachClientRouter = Router();

/**
 * @swagger
 * /api/v1/coach/clients:
 *   get:
 *     summary: Get coach clients
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach clients retrieved successfully
 */
coachClientRouter.get('/', (req, res) => {
    res.json({ message: 'Coach clients route' });
});

/**
 * @swagger
 * /api/v1/coach/clients/{id}:
 *   patch:
 *     summary: Update coach client
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
 *         description: Coach client updated successfully
 */
coachClientRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Coach client updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/coach/clients:
 *   post:
 *     summary: Create coach client
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
 *         description: Coach client created successfully
 *
 * /api/v1/coach/clients/{id}:
 *   delete:
 *     summary: Delete coach client
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
 *         description: Coach client deleted successfully
 */
coachClientRouter.post('/', (req, res) => {
    res.json({ message: 'Coach client created' });
});

coachClientRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Coach client deleted', id: req.params.id });
});
