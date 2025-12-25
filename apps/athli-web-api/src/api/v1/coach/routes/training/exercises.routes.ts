import { Router } from 'express';

export const coachExerciseRouter = Router();

/**
 * @swagger
 * /api/v1/coach/training/exercises:
 *   get:
 *     summary: Get coach exercises
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach exercises retrieved successfully
 */
coachExerciseRouter.get('/', (req, res) => {
    res.json({ message: 'Coach exercise route' });
});

/**
 * @swagger
 * /api/v1/coach/training/exercises/{id}:
 *   patch:
 *     summary: Update coach exercise
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
 *         description: Coach exercise updated successfully
 */
coachExerciseRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Coach exercise updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/coach/training/exercises:
 *   post:
 *     summary: Create coach exercise
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
 *         description: Coach exercise created successfully
 *
 * /api/v1/coach/training/exercises/{id}:
 *   delete:
 *     summary: Delete coach exercise
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
 *         description: Coach exercise deleted successfully
 */
coachExerciseRouter.post('/', (req, res) => {
    res.json({ message: 'Coach exercise created' });
});

coachExerciseRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Coach exercise deleted', id: req.params.id });
});
