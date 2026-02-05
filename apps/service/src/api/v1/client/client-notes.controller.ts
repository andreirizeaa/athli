import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientNotesController = {
    /**
     * Get all notes for a specific client
     * Can be called by the client themselves or by their coach
     */
    getNotes: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const coachIdHeader = req.header('x-coach-id');
        const isCoachView = !!coachIdHeader;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_notes')
            .select('*')
            .eq('client_id', targetClientId)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (isCoachView) {
            query = query.eq('coach_id', coachIdHeader);
        }

        const { data: notes, error } = await query;

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client notes retrieved successfully',
            data: { notes },
        });
    },

    /**
     * Create a new note for a client
     */
    createNote: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const coachIdHeader = req.header('x-coach-id');
        const isCoachView = !!coachIdHeader;
        const { title, body, is_pinned } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!title) {
            return res.status(400).json({ success: false, message: 'Note title is required' });
        }

        const supabase = getSupabaseClient();

        // If coach view, we need to ensure the coach owns the client
        // This is implicitly handled if we include coach_id in the insert
        // but for security we should verify the relationship if it's not a generic stub.

        const insertData: any = {
            client_id: targetClientId,
            title,
            body: body || '',
            is_pinned: is_pinned || false,
        };

        if (isCoachView) {
            insertData.coach_id = coachIdHeader;
        } else {
            // If client is creating a note, we need to find their coach_id
            // This table REQUIRE coach_id. Usually clients don't create notes for themselves in this specific table?
            // "client_notes" seems to be coach-written notes about the client based on the schema (coach_id NOT NULL).
            // If so, only coaches should be able to create notes here.

            // Let's check permissions. If it's for coaches only:
            return res.status(403).json({ success: false, message: 'Only coaches can create client notes' });
        }

        const { data: newNote, error } = await supabase
            .from('client_notes')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Note created successfully',
            data: { note: newNote },
        });
    },

    /**
     * Update an existing note
     */
    updateNote: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const coachIdHeader = req.header('x-coach-id');
        const isCoachView = !!coachIdHeader;
        const { id } = req.params;
        const updates = req.body;
        const { title, body, is_pinned } = updates;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!isCoachView) {
            return res.status(403).json({ success: false, message: 'Only coaches can update client notes' });
        }

        const supabase = getSupabaseClient();
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (title !== undefined) updateData.title = title;
        if (body !== undefined) updateData.body = body;
        if (is_pinned !== undefined) updateData.is_pinned = is_pinned;

        const { data: updatedNote, error } = await supabase
            .from('client_notes')
            .update(updateData)
            .eq('id', id)
            .eq('coach_id', coachIdHeader)
            .eq('client_id', targetClientId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        if (!updatedNote) {
            return notFound(res, { message: 'Note not found' });
        }

        success(res, {
            message: 'Note updated successfully',
            data: { note: updatedNote },
        });
    },

    /**
     * Delete a note
     */
    deleteNote: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const coachIdHeader = req.header('x-coach-id');
        const isCoachView = !!coachIdHeader;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!isCoachView) {
            return res.status(403).json({ success: false, message: 'Only coaches can delete client notes' });
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('client_notes')
            .delete()
            .eq('id', id)
            .eq('coach_id', coachIdHeader)
            .eq('client_id', targetClientId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },

    /**
     * Bulk delete notes
     */
    bulkDeleteNotes: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const coachIdHeader = req.header('x-coach-id');
        const isCoachView = !!coachIdHeader;
        const { noteIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!isCoachView) {
            return res.status(403).json({ success: false, message: 'Only coaches can delete client notes' });
        }

        if (!Array.isArray(noteIds) || noteIds.length === 0) {
            return res.status(400).json({ success: false, message: 'noteIds must be a non-empty array' });
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('client_notes')
            .delete()
            .in('id', noteIds)
            .eq('coach_id', coachIdHeader)
            .eq('client_id', targetClientId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },
};
