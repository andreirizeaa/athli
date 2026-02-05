import { Router } from 'express';
import multer from 'multer';
import { clientQuestionnairesController } from '../../client-questionnaires.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

// Configure multer for memory storage with higher limits for videos and base64 fields
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit for videos
        files: 20, // Max 20 files per submission
        fieldSize: 50 * 1024 * 1024, // 50MB limit for field values (base64 images in answers JSON)
    },
});

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
 * /api/v1/client/forms/questionnaires/media-url:
 *   get:
 *     summary: Get a signed URL for questionnaire media
 *     tags: [Client Forms]
 *     parameters:
 *       - in: query
 *         name: bucket
 *         required: true
 *         schema: { type: string, enum: [form_files, client_photos] }
 *       - in: query
 *         name: path
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 */
clientQuestionnaireRouter.get('/media-url', supabaseAuthenticate, clientQuestionnairesController.getMediaUrl);

/**
 * @swagger
 * /api/v1/client/forms/questionnaires/create:
 *   post:
 *     summary: Create a client-specific questionnaire (not from library)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               questions: { type: array }
 *     responses: { 201: { description: 'Created' } }
 */
clientQuestionnaireRouter.post('/create', supabaseAuthenticate, clientQuestionnairesController.createQuestionnaire);

/**
 * @swagger
 * /api/v1/client/forms/questionnaires/{id}:
 *   get:
 *     summary: Get a single questionnaire by ID
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 *   patch:
 *     summary: Update a questionnaire (questions, etc.)
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questions: { type: array }
 *               name: { type: string }
 *               description: { type: string }
 *     responses: { 200: { description: 'Success' } }
 */
clientQuestionnaireRouter.get('/:id', supabaseAuthenticate, clientQuestionnairesController.getQuestionnaireById);
clientQuestionnaireRouter.patch('/:id', supabaseAuthenticate, clientQuestionnairesController.updateQuestionnaire);

/**
 * @swagger
 * /api/v1/client/forms/questionnaires/{id}/submit:
 *   post:
 *     summary: Submit a questionnaire with optional file uploads
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               answers: { type: string, description: 'JSON stringified answers array' }
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitFormInput'
 *     responses: { 200: { description: 'Success' } }
 */
clientQuestionnaireRouter.post('/:id/submit', supabaseAuthenticate, upload.any(), clientQuestionnairesController.submitQuestionnaire);

/**
 * @swagger
 * /api/v1/client/forms/questionnaires/{id}/send:
 *   post:
 *     summary: Send a questionnaire to a client (update status from draft to pending)
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: 'Success' } }
 */
clientQuestionnaireRouter.post('/:id/send', supabaseAuthenticate, clientQuestionnairesController.sendQuestionnaire);

/**
 * @swagger
 * /api/v1/client/forms/questionnaires/{id}/resend:
 *   post:
 *     summary: Resend a questionnaire (create a copy and send again)
 *     tags: [Client Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-client-id
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     responses: { 201: { description: 'Created' } }
 */
clientQuestionnaireRouter.post('/:id/resend', supabaseAuthenticate, clientQuestionnairesController.resendQuestionnaire);
