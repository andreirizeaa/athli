import { Router } from 'express';
import { coachQuestionnairesController } from '../../coach-questionnaires.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const coachQuestionnaireRouter = Router();

/**
 * @swagger
 * /api/v1/coach/forms/questionnaires:
 *   get:
 *     summary: Get coach questionnaires
 *     tags: [Coach Forms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach questionnaires retrieved successfully
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
 *                         questionnaires:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CoachQuestionnaire'
 */
coachQuestionnaireRouter.get('/', supabaseAuthenticate, coachQuestionnairesController.getQuestionnaires);

/**
 * @swagger
 * /api/v1/coach/forms/questionnaires/{id}:
 *   get:
 *     summary: Get coach questionnaire by ID
 *     tags: [Coach Forms]
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
 *         description: Coach questionnaire retrieved successfully
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
 *                         questionnaire:
 *                           $ref: '#/components/schemas/CoachQuestionnaire'
 */
coachQuestionnaireRouter.get('/:id', supabaseAuthenticate, coachQuestionnairesController.getQuestionnaireById);

/**
 * @swagger
 * /api/v1/coach/forms/questionnaires/{id}:
 *   patch:
 *     summary: Update coach questionnaire
 *     tags: [Coach Forms]
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
 *             $ref: '#/components/schemas/UpdateCoachQuestionnaireInput'
 *     responses:
 *       200:
 *         description: Coach questionnaire updated successfully
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
 *                         questionnaire:
 *                           $ref: '#/components/schemas/CoachQuestionnaire'
 */
coachQuestionnaireRouter.patch('/:id', supabaseAuthenticate, coachQuestionnairesController.updateQuestionnaire);

/**
 * @swagger
 * /api/v1/coach/forms/questionnaires:
 *   post:
 *     summary: Create coach questionnaire
 *     tags: [Coach Forms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCoachQuestionnaireInput'
 *     responses:
 *       201:
 *         description: Coach questionnaire created successfully
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
 *                         questionnaire:
 *                           $ref: '#/components/schemas/CoachQuestionnaire'
 *
 * /api/v1/coach/forms/questionnaires/{id}:
 *   delete:
 *     summary: Delete coach questionnaire
 *     tags: [Coach Forms]
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
coachQuestionnaireRouter.post('/', supabaseAuthenticate, coachQuestionnairesController.createQuestionnaire);

coachQuestionnaireRouter.delete('/:id', supabaseAuthenticate, coachQuestionnairesController.deleteQuestionnaire);

/**
 * @swagger
 * /api/v1/coach/forms/questionnaires/{id}/duplicate:
 *   post:
 *     summary: Duplicate coach questionnaire
 *     tags: [Coach Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Coach questionnaire duplicated successfully
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
 *                         questionnaire:
 *                           $ref: '#/components/schemas/CoachQuestionnaire'
 */
coachQuestionnaireRouter.post('/:id/duplicate', supabaseAuthenticate, coachQuestionnairesController.duplicateQuestionnaire);
