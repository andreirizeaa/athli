import { Router } from 'express';

export const coachFlowRouter = Router();

/**
 * @swagger
 * /api/v1/coach/flows:
 *   get:
 *     summary: Get coach flows
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach flows retrieved successfully
 */
coachFlowRouter.get('/', (req, res) => {
    res.json({ message: 'Coach flows route' });
});

/**
 * @swagger
 * /api/v1/coach/flows/{id}:
 *   patch:
 *     summary: Update coach flow
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
 *         description: Coach flow updated successfully
 */
coachFlowRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Coach flow updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/coach/flows:
 *   post:
 *     summary: Create coach flow
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
 *         description: Coach flow created successfully
 *
 * /api/v1/coach/flows/{id}:
 *   delete:
 *     summary: Delete coach flow
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
 *         description: Coach flow deleted successfully
 */
coachFlowRouter.post('/', (req, res) => {
    res.json({ message: 'Coach flow created' });
});

coachFlowRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Coach flow deleted', id: req.params.id });
});
