import { Request, Response } from 'express';
import { success, unauthorized, created, noContent } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { createCoachNotification, resolveCoachId, resolveClientName } from '../../../services/notification.service';
import { NOTIFICATION_TYPES, NOTIFICATION_TITLES } from '@athli/shared-types/src/constants/notification-constants';

export const clientDetailsController = {
    /**
     * Get client bio
     */
    getBio: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;

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
     * Create a single goal
     */
    createGoal: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachRequest = !!req.header('x-client-id') && req.header('x-client-id') !== userId;
        const { goal, target_date, details } = req.body;
        console.log('[ClientDetails] createGoal — isCoachRequest:', isCoachRequest, '| x-client-id:', req.header('x-client-id'), '| x-coach-id:', req.header('x-coach-id'), '| will notify coach:', !isCoachRequest);

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        let coachId = userId;
        if (!isCoachRequest) {
            const resolved = await resolveCoachId(targetClientId);
            if (resolved) coachId = resolved;
        }

        const { data, error } = await supabase
            .from('client_goals')
            .insert({
                client_id: targetClientId,
                coach_id: coachId,
                goal,
                target_date: target_date || null,
                details: details || null,
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Notify coach if client created the goal
        if (!isCoachRequest) {
            const clientName = await resolveClientName(targetClientId);
            createCoachNotification({
                coachId,
                clientId: targetClientId,
                notificationType: NOTIFICATION_TYPES.goal_added,
                title: NOTIFICATION_TITLES.goal_added,
                description: `${clientName || 'Client'} added a goal: ${goal}`,
                metadata: { goal_id: data.id, name: goal },
            });
        }

        created(res, {
            message: 'Goal created successfully',
            data: { goal: data },
        });
    },

    /**
     * Update a single goal
     */
    updateGoal: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachRequest = !!req.header('x-client-id') && req.header('x-client-id') !== userId;
        const goalId = req.params.id;
        const { goal, target_date, details } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const updateFields: any = {};
        if (goal !== undefined) updateFields.goal = goal;
        if (target_date !== undefined) updateFields.target_date = target_date || null;
        if (details !== undefined) updateFields.details = details || null;

        const { data, error } = await supabase
            .from('client_goals')
            .update(updateFields)
            .eq('id', goalId)
            .eq('client_id', targetClientId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Notify coach if client edited the goal
        if (!isCoachRequest) {
            const coachId = await resolveCoachId(targetClientId);
            if (coachId) {
                const clientName = await resolveClientName(targetClientId);
                createCoachNotification({
                    coachId,
                    clientId: targetClientId,
                    notificationType: NOTIFICATION_TYPES.goal_edited,
                    title: NOTIFICATION_TITLES.goal_edited,
                    description: `${clientName || 'Client'} updated a goal: ${data.goal}`,
                    metadata: { goal_id: goalId, name: data.goal },
                });
            }
        }

        success(res, {
            message: 'Goal updated successfully',
            data: { goal: data },
        });
    },

    /**
     * Delete a single goal
     */
    deleteGoal: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachRequest = !!req.header('x-client-id') && req.header('x-client-id') !== userId;
        const goalId = req.params.id;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Fetch goal name before deleting (for notification)
        const { data: existing } = await supabase
            .from('client_goals')
            .select('goal')
            .eq('id', goalId)
            .eq('client_id', targetClientId)
            .single();

        const { error } = await supabase
            .from('client_goals')
            .delete()
            .eq('id', goalId)
            .eq('client_id', targetClientId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Notify coach if client deleted the goal
        if (!isCoachRequest && existing) {
            const coachId = await resolveCoachId(targetClientId);
            if (coachId) {
                const clientName = await resolveClientName(targetClientId);
                createCoachNotification({
                    coachId,
                    clientId: targetClientId,
                    notificationType: NOTIFICATION_TYPES.goal_deleted,
                    title: NOTIFICATION_TITLES.goal_deleted,
                    description: `${clientName || 'Client'} removed a goal: ${existing.goal}`,
                    metadata: { goal_id: goalId, name: existing.goal },
                });
            }
        }

        noContent(res);
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
     * Create a single injury
     */
    createInjury: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachRequest = !!req.header('x-client-id') && req.header('x-client-id') !== userId;
        const { injury, date, details } = req.body;
        console.log('[ClientDetails] createInjury — isCoachRequest:', isCoachRequest, '| x-client-id:', req.header('x-client-id'), '| x-coach-id:', req.header('x-coach-id'), '| will notify coach:', !isCoachRequest);

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        let coachId = userId;
        if (!isCoachRequest) {
            const resolved = await resolveCoachId(targetClientId);
            if (resolved) coachId = resolved;
        }

        const { data, error } = await supabase
            .from('client_injuries')
            .insert({
                client_id: targetClientId,
                coach_id: coachId,
                injury,
                date: date || null,
                details: details || null,
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Notify coach if client created the injury
        if (!isCoachRequest) {
            const clientName = await resolveClientName(targetClientId);
            createCoachNotification({
                coachId,
                clientId: targetClientId,
                notificationType: NOTIFICATION_TYPES.injury_added,
                title: NOTIFICATION_TITLES.injury_added,
                description: `${clientName || 'Client'} added an injury: ${injury}`,
                metadata: { injury_id: data.id, name: injury },
            });
        }

        created(res, {
            message: 'Injury created successfully',
            data: { injury: data },
        });
    },

    /**
     * Update a single injury
     */
    updateInjury: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachRequest = !!req.header('x-client-id') && req.header('x-client-id') !== userId;
        const injuryId = req.params.id;
        const { injury, date, details } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const updateFields: any = {};
        if (injury !== undefined) updateFields.injury = injury;
        if (date !== undefined) updateFields.date = date || null;
        if (details !== undefined) updateFields.details = details || null;

        const { data, error } = await supabase
            .from('client_injuries')
            .update(updateFields)
            .eq('id', injuryId)
            .eq('client_id', targetClientId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Notify coach if client edited the injury
        if (!isCoachRequest) {
            const coachId = await resolveCoachId(targetClientId);
            if (coachId) {
                const clientName = await resolveClientName(targetClientId);
                createCoachNotification({
                    coachId,
                    clientId: targetClientId,
                    notificationType: NOTIFICATION_TYPES.injury_edited,
                    title: NOTIFICATION_TITLES.injury_edited,
                    description: `${clientName || 'Client'} updated an injury: ${data.injury}`,
                    metadata: { injury_id: injuryId, name: data.injury },
                });
            }
        }

        success(res, {
            message: 'Injury updated successfully',
            data: { injury: data },
        });
    },

    /**
     * Delete a single injury
     */
    deleteInjury: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachRequest = !!req.header('x-client-id') && req.header('x-client-id') !== userId;
        const injuryId = req.params.id;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Fetch injury name before deleting (for notification)
        const { data: existing } = await supabase
            .from('client_injuries')
            .select('injury')
            .eq('id', injuryId)
            .eq('client_id', targetClientId)
            .single();

        const { error } = await supabase
            .from('client_injuries')
            .delete()
            .eq('id', injuryId)
            .eq('client_id', targetClientId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Notify coach if client deleted the injury
        if (!isCoachRequest && existing) {
            const coachId = await resolveCoachId(targetClientId);
            if (coachId) {
                const clientName = await resolveClientName(targetClientId);
                createCoachNotification({
                    coachId,
                    clientId: targetClientId,
                    notificationType: NOTIFICATION_TYPES.injury_deleted,
                    title: NOTIFICATION_TITLES.injury_deleted,
                    description: `${clientName || 'Client'} removed an injury: ${existing.injury}`,
                    metadata: { injury_id: injuryId, name: existing.injury },
                });
            }
        }

        noContent(res);
    },
};
