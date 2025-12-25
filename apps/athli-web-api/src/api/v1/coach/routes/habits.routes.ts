import { Router } from 'express';

export const coachHabitRouter = Router();

/**
 * @swagger
 * /api/v1/coach/habits:
 *   get:
 *     summary: Get coach habits
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach habits retrieved successfully
 */
coachHabitRouter.get('/', (req, res) => {
    res.json({ message: 'Coach habits route' });
});

/**
 * @swagger
 * /api/v1/coach/habits/{id}:
 *   patch:
 *     summary: Update coach habit
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
 *         description: Coach habit updated successfully
 */
coachHabitRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Coach habit updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/coach/habits:
 *   post:
 *     summary: Create coach habit
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
 *         description: Coach habit created successfully
 *
 * /api/v1/coach/habits/{id}:
 *   delete:
 *     summary: Delete coach habit
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
 *         description: Coach habit deleted successfully
 */
coachHabitRouter.post('/', (req, res) => {
    res.json({ message: 'Coach habit created' });
});

coachHabitRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Coach habit deleted', id: req.params.id });
});
