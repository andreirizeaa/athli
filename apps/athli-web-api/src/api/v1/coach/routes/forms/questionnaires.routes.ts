import { Router } from 'express';
import { coachQuestionnairesController } from '../../coach-questionnaires.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const coachQuestionnaireRouter = Router();

/**
 * @swagger
 * /api/v1/coach/forms/questionnaires:
 *   get:
 *     summary: Get coach questionnaires
 *     tags: [Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach questionnaires retrieved successfully
 */
coachQuestionnaireRouter.get('/', supabaseAuthenticate, coachQuestionnairesController.getQuestionnaires);

/**
 * @swagger
 * /api/v1/coach/forms/questionnaires/{id}:
 *   patch:
 *     summary: Update coach questionnaire
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
 *         description: Coach questionnaire updated successfully
 */
coachQuestionnaireRouter.patch('/:id', supabaseAuthenticate, coachQuestionnairesController.updateQuestionnaire);

/**
 * @swagger
 * /api/v1/coach/forms/questionnaires:
 *   post:
 *     summary: Create coach questionnaire
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
 *         description: Coach questionnaire created successfully
 *
 * /api/v1/coach/forms/questionnaires/{id}:
 *   delete:
 *     summary: Delete coach questionnaire
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
 *         description: Coach questionnaire deleted successfully
 */
coachQuestionnaireRouter.get('/:id', supabaseAuthenticate, coachQuestionnairesController.getQuestionnaireById);

coachQuestionnaireRouter.post('/', supabaseAuthenticate, coachQuestionnairesController.createQuestionnaire);

coachQuestionnaireRouter.delete('/:id', supabaseAuthenticate, coachQuestionnairesController.deleteQuestionnaire);
