import { Router } from 'express';

export const coachProgramRouter = Router();

/**
 * @swagger
 * /api/v1/coach/training/programs:
 *   get:
 *     summary: Get coach programs
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach programs retrieved successfully
 */
coachProgramRouter.get('/', (req, res) => {
    res.json({ message: 'Coach programs route' });
});

/**
 * @swagger
 * /api/v1/coach/training/programs:
 *   post:
 *     summary: Create coach program
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
 *         description: Coach program created successfully
 *
 * /api/v1/coach/training/programs/{id}:
 *   patch:
 *     summary: Update coach program
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
 *         description: Coach program updated successfully
 *   delete:
 *     summary: Delete coach program
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
 *         description: Coach program deleted successfully
 */
coachProgramRouter.post('/', (req, res) => {
    res.json({ message: 'Coach program created' });
});

coachProgramRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Coach program updated', id: req.params.id });
});

coachProgramRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Coach program deleted', id: req.params.id });
});
