import { Request, Response } from 'express';
import { success, unauthorized, created, notFound, noContent, forbidden } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientCheckInsController = {
    /**
     * Get all check-ins for a client
     */
    getCheckIns: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');

        let targetClientId: string;
        let targetCoachId: string | undefined;

        if (coachIdHeader) {
            if (coachIdHeader !== userId) return unauthorized(res, { message: 'Coach ID mismatch' });
            if (!clientIdHeader) return forbidden(res, { message: 'x-client-id header required' });
            targetClientId = clientIdHeader as string;
            targetCoachId = coachIdHeader as string;

            const supabase = getSupabaseClient();
            const { data: relation } = await supabase
                .from('coach_client_assignments')
                .select('client_id')
                .eq('coach_id', targetCoachId)
                .eq('client_id', targetClientId)
                .single();

            if (!relation) return forbidden(res, { message: 'Forbidden' });
        } else {
            if (clientIdHeader && clientIdHeader !== userId) return forbidden(res, { message: 'Client ID mismatch' });
            targetClientId = userId;
            targetCoachId = coachIdHeader as string;
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_checkins')
            .select('*')
            .eq('client_id', targetClientId);

        if (targetCoachId) {
            query = query.eq('coach_id', targetCoachId);
        }

        const { data: assignments, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });

        const checkins = assignments.map((a: any) => ({
            id: a.id,
            assignment_id: a.id,
            coach_id: a.coach_id,
            name: a.name,
            description: a.description,
            schedule_config: a.schedule_config,
            questions: a.questions,
            status: a.status,
            completed_at: a.completed_at,
            // Responses might be in log table or here?
            // Assuming transient nature, responses are logs.
        }));

        success(res, {
            message: 'Client check-ins retrieved successfully',
            data: { checkins },
        });
    },

    /**
     * Assign check-in (Library or Private) (Coach Only)
     */
    assignCheckIn: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { checkInIds, name, description, questions, schedule_config, cron_expression } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Verify Relation
        const { data: relation } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .eq('client_id', targetClientId)
            .single();

        if (!relation) return forbidden(res, { message: 'Forbidden' });

        // 1. Private
        if (name) {
            const { data: checkin, error } = await supabase
                .from('client_checkins')
                .insert({
                    client_id: targetClientId,
                    coach_id: targetCoachId,
                    name,
                    description,
                    questions: questions || [],
                    schedule_config: schedule_config || null,
                    cron_expression: cron_expression || null
                })
                .select()
                .single();

            if (error) return res.status(500).json({ success: false, message: error.message });
            return created(res, { message: 'Private check-in created', data: { checkin } });
        }

        // 2. Library
        if (!Array.isArray(checkInIds) || checkInIds.length === 0) return res.status(400).json({ success: false, message: 'checkInIds required' });

        const { data: libraryItems, error: fetchError } = await supabase
            .from('coach_checkins')
            .select('*')
            .in('id', checkInIds);

        if (fetchError) return res.status(500).json({ success: false, message: fetchError.message });
        if (!libraryItems || libraryItems.length === 0) return notFound(res, { message: 'No check-ins found' });

        const assignments = libraryItems.map(h => ({
            client_id: targetClientId,
            coach_id: targetCoachId,
            name: h.name,
            description: h.description,
            questions: h.questions,
            schedule_config: schedule_config || h.schedule_config,
            cron_expression: cron_expression || h.cron_expression
        }));

        const { error: insertError } = await supabase.from('client_checkins').insert(assignments);
        if (insertError) return res.status(500).json({ success: false, message: insertError.message });

        created(res, { message: 'Check-ins assigned successfully' });
    },

    /**
     * Submit a check-in
     */
    submitCheckIn: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { responses } = req.body;

        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });

        const supabase = getSupabaseClient();

        // 1. Fetch assignment details
        const { data: assignmentDetails, error: detailsError } = await supabase
            .from('client_checkins')
            .select('client_id, coach_id')
            .eq('id', id)
            .eq('client_id', targetClientId)
            .single();

        if (detailsError || !assignmentDetails) return notFound(res, { message: 'Assignment not found' });

        // 2. Insert into logs
        await supabase.from('client_checkin_logs').insert({
            client_id: targetClientId,
            coach_id: assignmentDetails.coach_id,
            assignment_id: id,
            answers: responses,
            submission_date: new Date().toISOString(),
            status: 'completed'
        });

        // 3. Update assignment status
        const { data, error } = await supabase
            .from('client_checkins')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('client_id', targetClientId)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        success(res, {
            message: 'Check-in submitted successfully',
            data: { assignment: data },
        });
    },

    /**
     * Delete (unassign) a check-in
     */
    deleteAssignment: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { checkInIds } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!Array.isArray(checkInIds)) return res.status(400).json({ success: false, message: 'checkInIds array required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('client_checkins')
            .delete()
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .in('id', checkInIds);

        if (error) return res.status(500).json({ success: false, message: error.message });
        noContent(res);
    },
};
