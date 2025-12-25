import { Router } from 'express';

export const coachWorkoutRouter = Router();

/**
 * @swagger
 * /api/v1/coach/training/workouts:
 *   get:
 *     summary: Get coach workouts
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach workouts retrieved successfully
 */
coachWorkoutRouter.get('/', (req, res) => {
    res.json({ message: 'Coach workouts route' });
});

/**
 * @swagger
 * /api/v1/coach/training/workouts:
 *   post:
 *     summary: Create coach workout
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
 *         description: Coach workout created successfully
 *
 * /api/v1/coach/training/workouts/{id}:
 *   patch:
 *     summary: Update coach workout
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
 *         description: Coach workout updated successfully
 *   delete:
 *     summary: Delete coach workout
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
 *         description: Coach workout deleted successfully
 */
coachWorkoutRouter.post('/', (req, res) => {
    res.json({ message: 'Coach workout created' });
});

coachWorkoutRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Coach workout updated', id: req.params.id });
});

coachWorkoutRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Coach workout deleted', id: req.params.id });
});
