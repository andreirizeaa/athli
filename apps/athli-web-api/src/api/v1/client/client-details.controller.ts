import { Request, Response } from 'express';
import { success, unauthorized, created, noContent } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientDetailsController = {
    /**
     * Get client bio
     */
    getBio: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_bio')
            .select('bio')
            .eq('client_id', targetClientId)
            .single();

        const { data, error } = await query;

        if (error && error.code !== 'PGRST116') { // PGRST116 is no rows
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client bio retrieved successfully',
            data: { bio: data?.bio || '' },
        });
    },

    /**
     * Update client bio
     */
    updateBio: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { bio } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure we have coach_id if coach is updating
        const coachId = req.header('x-client-id') ? userId : null;

        const { data, error } = await supabase
            .from('client_bio')
            .upsert({
                client_id: targetClientId,
                coach_id: coachId || userId, // In a real app we'd fetch the coach_id if client is updating, but here we assume coach_id is required
                bio,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'client_id' })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client bio updated successfully',
            data: { bio: data.bio },
        });
    },

    /**
     * Get client goals
     */
    getGoals: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: goals, error } = await supabase
            .from('client_goals')
            .select('*')
            .eq('client_id', targetClientId)
            .order('created_at', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client goals retrieved successfully',
            data: { goals },
        });
    },

    /**
     * Update client goals (Sync)
     */
    updateGoals: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { goals } = req.body; // Array of { goal: string, target_date: string | null }

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // This table requires coach_id. We'll get it from context or relationship.
        let coachId = userId;
        if (!req.header('x-client-id')) {
            // If client is updating (though usually coach does this), we need to find their coach
            const { data: assignment } = await supabase
                .from('coach_client_assignments')
                .select('coach_id')
                .eq('client_id', targetClientId)
                .single();
            if (assignment) coachId = assignment.coach_id;
        }

        try {
            // Simple sync: delete all and re-insert for this specific coach-client pair
            await supabase.from('client_goals')
                .delete()
                .eq('client_id', targetClientId)
                .eq('coach_id', coachId);

            if (goals && goals.length > 0) {
                const inserts = goals.map((g: any) => ({
                    client_id: targetClientId,
                    coach_id: coachId,
                    goal: g.goal,
                    target_date: g.target_date || null,
                    details: g.details || null,
                }));

                const { error: insertError } = await supabase.from('client_goals').insert(inserts);
                if (insertError) throw insertError;
            }

            success(res, { message: 'Client goals updated successfully' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Get client injuries
     */
    getInjuries: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: injuries, error } = await supabase
            .from('client_injuries')
            .select('*')
            .eq('client_id', targetClientId)
            .order('created_at', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client injuries retrieved successfully',
            data: { injuries },
        });
    },

    /**
     * Update client injuries (Sync)
     */
    updateInjuries: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { injuries } = req.body; // Array of { injury: string, date: string | null }

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        let coachId = userId;
        if (!req.header('x-client-id')) {
            const { data: assignment } = await supabase
                .from('coach_client_assignments')
                .select('coach_id')
                .eq('client_id', targetClientId)
                .single();
            if (assignment) coachId = assignment.coach_id;
        }

        try {
            // Simple sync: delete all and re-insert for this specific coach-client pair
            await supabase.from('client_injuries')
                .delete()
                .eq('client_id', targetClientId)
                .eq('coach_id', coachId);

            if (injuries && injuries.length > 0) {
                const inserts = injuries.map((i: any) => ({
                    client_id: targetClientId,
                    coach_id: coachId,
                    injury: i.injury,
                    date: i.date || null,
                    details: i.details || null,
                }));

                const { error: insertError } = await supabase.from('client_injuries').insert(inserts);
                if (insertError) throw insertError;
            }

            success(res, { message: 'Client injuries updated successfully' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },
};
