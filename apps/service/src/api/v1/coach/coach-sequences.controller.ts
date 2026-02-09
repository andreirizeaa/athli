import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachSequenceController = {
    /**
     * Get all sequences for a coach
     */
    getSequences: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: sequences, error } = await supabase
            .from('coach_sequences')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach sequences retrieved successfully',
            data: { sequences },
        });
    },

    /**
     * Get a single sequence by ID
     */
    getSequenceById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: sequence, error } = await supabase
            .from('coach_sequences')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return notFound(res, { message: 'Sequence not found' });
            }
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach sequence retrieved successfully',
            data: { sequence },
        });
    },

    /**
     * Create a new sequence
     */
    createSequence: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name, description, flow_data } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('coach_sequences')
            .insert([
                {
                    coach_id: userId,
                    name,
                    description,
                    flow_data,
                },
            ])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Coach sequence created successfully',
            data: { sequence: data },
        });
    },

    /**
     * Update a sequence
     */
    updateSequence: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('coach_sequences')
            .update(updates)
            .eq('id', id)
            .eq('coach_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        if (!data) {
            return notFound(res, { message: 'Sequence not found' });
        }

        success(res, {
            message: 'Coach sequence updated successfully',
            data: { sequence: data },
        });
    },

    /**
     * Delete a sequence
     */
    deleteSequence: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Check if any packages reference this sequence
        const { data: linkedPackages } = await supabase
            .from('coach_packages')
            .select('id')
            .eq('sequence_id', id)
            .limit(1);

        if (linkedPackages && linkedPackages.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete sequence: it is linked to one or more packages. Remove the sequence from those packages first.',
            });
        }

        const { error } = await supabase
            .from('coach_sequences')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },
};
