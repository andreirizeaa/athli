import { Router } from 'express';

export const coachCheckInRouter = Router();

/**
 * @swagger
 * /api/v1/coach/forms/check-ins:
 *   get:
 *     summary: Get coach check-ins
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach check-ins retrieved successfully
 */
coachCheckInRouter.get('/', (req, res) => {
    res.json({ message: 'Coach check-in route' });
});

/**
 * @swagger
 * /api/v1/coach/forms/check-ins/{id}:
 *   patch:
 *     summary: Update coach check-in
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
 *         description: Coach check-in updated successfully
 */
coachCheckInRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Coach check-in updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/coach/forms/check-ins:
 *   post:
 *     summary: Create coach check-in
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
 *         description: Coach check-in created successfully
 *
 * /api/v1/coach/forms/check-ins/{id}:
 *   delete:
 *     summary: Delete coach check-in
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
 *         description: Coach check-in deleted successfully
 */
coachCheckInRouter.post('/', (req, res) => {
    res.json({ message: 'Coach check-in created' });
});

coachCheckInRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Coach check-in deleted', id: req.params.id });
});
