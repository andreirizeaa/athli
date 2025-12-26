import { Router } from 'express';

export const coachNoteRouter = Router();

/**
 * @swagger
 * /api/v1/coach/notes:
 *   get:
 *     summary: Get coach notes
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach notes retrieved successfully
 */
coachNoteRouter.get('/', (req, res) => {
    res.json({ message: 'Coach notes route' });
});

/**
 * @swagger
 * /api/v1/coach/notes/{id}:
 *   patch:
 *     summary: Update coach note
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
 *         description: Coach note updated successfully
 */
coachNoteRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Coach note updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/coach/notes:
 *   post:
 *     summary: Create coach note
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
 *         description: Coach note created successfully
 *
 * /api/v1/coach/notes/{id}:
 *   delete:
 *     summary: Delete coach note
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
 *         description: Coach note deleted successfully
 */
coachNoteRouter.post('/', (req, res) => {
    res.json({ message: 'Coach note created' });
});

coachNoteRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Coach note deleted', id: req.params.id });
});
