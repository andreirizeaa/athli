import { Router } from 'express';
import { clientQuestionnairesController } from '../../client-questionnaires.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const clientQuestionnaireRouter = Router();

/**
 * @swagger
 * /api/v1/client/forms/questionnaires:
 *   get:
 *     summary: Get client questionnaire assignments
 *     tags: [Client Forms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client questionnaires retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         assignments:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ClientQuestionnaire'
 */
clientQuestionnaireRouter.get('/', supabaseAuthenticate, clientQuestionnairesController.getQuestionnaires);

/**
 * @swagger
 * /api/v1/client/forms/questionnaires/{id}/submit:
 *   post:
 *     summary: Submit a questionnaire
 *     tags: [Client Forms]
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
 *             $ref: '#/components/schemas/SubmitFormInput'
 *     responses:
 *       200:
 *         description: Questionnaire submitted successfully
 */
clientQuestionnaireRouter.post('/:id/submit', supabaseAuthenticate, clientQuestionnairesController.submitQuestionnaire);

/**
 * @swagger
 * /api/v1/client/questionnaires/{id}:
 *   delete:
 *     summary: Unassign (Hide) a questionnaire
 *     tags: [Client Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Questionnaire unassigned successfully
 */
clientQuestionnaireRouter.delete('/:id', supabaseAuthenticate, clientQuestionnairesController.deleteAssignment);
clientQuestionnaireRouter.delete('/', supabaseAuthenticate, clientQuestionnairesController.deleteAssignment);
