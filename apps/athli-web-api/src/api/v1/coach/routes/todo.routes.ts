import { Router } from 'express';
import { coachTodoController } from '../coach-todo.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const coachTodoRouter = Router();

/**
 * @swagger
 * /api/v1/coach/todo/own:
 *   get:
 *     summary: Get all "Your List" todos
 *     tags: [Coach Todo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todos retrieved successfully
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
 *                         todos:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Todo'
 */
coachTodoRouter.get('/own', supabaseAuthenticate, coachTodoController.getOwnTodos);

/**
 * @swagger
 * /api/v1/coach/todo/own:
 *   post:
 *     summary: Create a new "Your List" todo
 *     tags: [Coach Todo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTodoRequest'
 *     responses:
 *       201:
 *         description: Todo created successfully
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
 *                         todo:
 *                           $ref: '#/components/schemas/Todo'
 */
coachTodoRouter.post('/own', supabaseAuthenticate, coachTodoController.createOwnTodo);

/**
 * @swagger
 * /api/v1/coach/todo/own/{id}:
 *   patch:
 *     summary: Update a "Your List" todo
 *     tags: [Coach Todo]
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
 *             properties:
 *               title: { type: 'string' }
 *               information: { type: 'string' }
 *               type: { type: 'string', enum: ['client', 'general'] }
 *               client_id: { type: 'string' }
 *               due_date: { type: 'string', format: 'date-time' }
 *               completed: { type: 'boolean' }
 *     responses:
 *       200:
 *         description: Todo updated successfully
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
 *                         todo:
 *                           $ref: '#/components/schemas/Todo'
 */
coachTodoRouter.patch('/own/:id', supabaseAuthenticate, coachTodoController.updateOwnTodo);

/**
 * @swagger
 * /api/v1/coach/todo/own/{id}:
 *   delete:
 *     summary: Delete a "Your List" todo
 *     tags: [Coach Todo]
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
 *         description: Todo deleted successfully
 */
coachTodoRouter.delete('/own/:id', supabaseAuthenticate, coachTodoController.deleteOwnTodo);

/**
 * @swagger
 * /api/v1/coach/todo/auto:
 *   get:
 *     summary: Get all "Athli Assistant" todos
 *     tags: [Coach Todo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todos retrieved successfully
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
 *                         todos:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AutoTodo'
 */
coachTodoRouter.get('/auto', supabaseAuthenticate, coachTodoController.getAutoTodos);

/**
 * @swagger
 * /api/v1/coach/todo/auto/{id}:
 *   delete:
 *     summary: Complete (delete) an "Athli Assistant" todo
 *     tags: [Coach Todo]
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
 *         description: Todo completed successfully
 */
coachTodoRouter.delete('/auto/:id', supabaseAuthenticate, coachTodoController.deleteAutoTodo);
