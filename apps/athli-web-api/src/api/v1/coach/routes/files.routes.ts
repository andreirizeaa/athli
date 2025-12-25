import { Router } from 'express';

export const coachFileRouter = Router();

/**
 * @swagger
 * /api/v1/coach/files:
 *   get:
 *     summary: Get coach files
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach files retrieved successfully
 */
coachFileRouter.get('/', (req, res) => {
    res.json({ message: 'Coach files route' });
});

/**
 * @swagger
 * /api/v1/coach/files/{id}:
 *   patch:
 *     summary: Update coach file
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
 *         description: Coach file updated successfully
 */
coachFileRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Coach file updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/coach/files:
 *   post:
 *     summary: Create coach file
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
 *         description: Coach file created successfully
 *
 * /api/v1/coach/files/{id}:
 *   delete:
 *     summary: Delete coach file
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
 *         description: Coach file deleted successfully
 */
coachFileRouter.post('/', (req, res) => {
    res.json({ message: 'Coach file created' });
});

coachFileRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Coach file deleted', id: req.params.id });
});
