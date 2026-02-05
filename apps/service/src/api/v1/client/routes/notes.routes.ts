import { Router } from 'express';
import { clientNotesController } from '../client-notes.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const clientNoteRouter = Router();

/**
 * @swagger
 * /api/v1/client/notes:
 *   get:
 *     summary: Get client notes
 *     tags: [Client Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notes retrieved successfully
 */
clientNoteRouter.get('/', supabaseAuthenticate, clientNotesController.getNotes);

/**
 * @swagger
 * /api/v1/client/notes:
 *   post:
 *     summary: Create a new note
 *     tags: [Client Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               body: { type: string }
 *               is_pinned: { type: boolean }
 *     responses:
 *       201:
 *         description: Note created successfully
 */
clientNoteRouter.post('/', supabaseAuthenticate, clientNotesController.createNote);

/**
 * @swagger
 * /api/v1/client/notes/{id}:
 *   patch:
 *     summary: Update a note
 *     tags: [Client Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               body: { type: string }
 *               is_pinned: { type: boolean }
 *     responses:
 *       200:
 *         description: Note updated successfully
 */
clientNoteRouter.patch('/:id', supabaseAuthenticate, clientNotesController.updateNote);

/**
 * @swagger
 * /api/v1/client/notes/{id}:
 *   delete:
 *     summary: Delete a note
 *     tags: [Client Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Note deleted successfully
 */
clientNoteRouter.delete('/:id', supabaseAuthenticate, clientNotesController.deleteNote);

/**
 * @swagger
 * /api/v1/client/notes:
 *   delete:
 *     summary: Bulk delete notes
 *     tags: [Client Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-client-id
 *         schema: { type: string }
 *         description: Client ID (required for coach view)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [noteIds]
 *             properties:
 *               noteIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       204:
 *         description: Notes deleted successfully
 */
clientNoteRouter.delete('/', supabaseAuthenticate, clientNotesController.bulkDeleteNotes);
