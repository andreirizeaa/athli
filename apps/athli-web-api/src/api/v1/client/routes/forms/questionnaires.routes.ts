import { Router } from 'express';

export const clientQuestionnaireRouter = Router();

/**
 * @swagger
 * /api/v1/client/forms/questionnaires:
 *   get:
 *     summary: Get client questionnaires
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client questionnaires retrieved successfully
 */
clientQuestionnaireRouter.get('/', (req, res) => {
    res.json({ message: 'Client questionnaire route' });
});

/**
 * @swagger
 * /api/v1/client/forms/questionnaires/{id}:
 *   patch:
 *     summary: Update client questionnaire
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
 *         description: Client questionnaire updated successfully
 */
clientQuestionnaireRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Client questionnaire updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/client/forms/questionnaires:
 *   post:
 *     summary: Create client questionnaire
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
 *         description: Client questionnaire created successfully
 *
 * /api/v1/client/forms/questionnaires/{id}:
 *   delete:
 *     summary: Delete client questionnaire
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
 *         description: Client questionnaire deleted successfully
 */
clientQuestionnaireRouter.post('/', (req, res) => {
    res.json({ message: 'Client questionnaire created' });
});

clientQuestionnaireRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Client questionnaire deleted', id: req.params.id });
});
