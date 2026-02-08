import { Router } from 'express';
import { clientTasksController } from '../client-tasks.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const clientTaskRouter = Router();

/**
 * @swagger
 * /api/v1/client/tasks:
 *   get:
 *     summary: Get client tasks
 *     tags: [Client Tasks]
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *       - in: header
 *         name: x-coach-id
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Comma-separated task types (check_in,metric,habit,questionnaire)
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses: { 200: { description: 'Success' } }
 */
clientTaskRouter.get('/', supabaseAuthenticate, clientTasksController.getTasks);

/**
 * @swagger
 * /api/v1/client/tasks/generate:
 *   post:
 *     summary: Manually trigger task generation (Coach only)
 *     tags: [Client Tasks]
 *     parameters:
 *       - in: header
 *         name: x-coach-id
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: 'Tasks generated' } }
 */
clientTaskRouter.post('/generate', supabaseAuthenticate, clientTasksController.generateTasks);

/**
 * @swagger
 * /api/v1/client/tasks/{id}:
 *   delete:
 *     summary: Dismiss/complete a task manually
 *     tags: [Client Tasks]
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
 *     responses: { 204: { description: 'Deleted' } }
 */
clientTaskRouter.delete('/:id', supabaseAuthenticate, clientTasksController.deleteTask);
