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
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 *   post:
 *     summary: Assign questionnaires to client (Coach only)
 *     tags: [Client Forms]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *   delete:
 *     summary: Unassign questionnaires from client (Coach only)
 *     tags: [Client Forms]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 */
clientQuestionnaireRouter.get('/', supabaseAuthenticate, clientQuestionnairesController.getQuestionnaires);
clientQuestionnaireRouter.post('/', supabaseAuthenticate, clientQuestionnairesController.assignQuestionnaire);
clientQuestionnaireRouter.delete('/', supabaseAuthenticate, clientQuestionnairesController.deleteAssignment);

/**
 * @swagger
 * /api/v1/client/forms/questionnaires/{id}/submit:
 *   post:
 *     summary: Submit a questionnaire
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitFormInput'
 *     responses: { 200: { description: 'Success' } }
 */
clientQuestionnaireRouter.post('/:id/submit', supabaseAuthenticate, clientQuestionnairesController.submitQuestionnaire);
