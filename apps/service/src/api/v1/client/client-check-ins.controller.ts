import { Request, Response } from 'express';
import { success, unauthorized, created, notFound, noContent, forbidden } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { createCoachNotification, resolveClientName } from '../../../services/notification.service';
import { NOTIFICATION_TYPES, NOTIFICATION_TITLES } from '@athli/shared-types/notification-constants';

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

        // Determine request context by matching userId to headers
        const isCoachRequest = coachIdHeader && coachIdHeader === userId;

        if (isCoachRequest) {
            // COACH SCENARIO: Coach accessing client's data
            if (!clientIdHeader) {
                return forbidden(res, { message: 'x-client-id header required for coach requests' });
            }

            targetClientId = clientIdHeader;
            targetCoachId = coachIdHeader;

            // Verify coach-client relationship
            const supabase = getSupabaseClient();
            const { data: relation } = await supabase
                .from('coach_client_assignments')
                .select('client_id')
                .eq('coach_id', targetCoachId)
                .eq('client_id', targetClientId)
                .single();

            if (!relation) {
                return forbidden(res, { message: 'Client not assigned to this coach' });
            }
        } else {
            // CLIENT SCENARIO: Client accessing their own data
            // If x-client-id provided, it must match authenticated user
            if (clientIdHeader && clientIdHeader !== userId) {
                return forbidden(res, { message: 'Cannot access another client\'s data' });
            }

            targetClientId = clientIdHeader || userId;

            // x-coach-id scopes to a specific coach relationship (optional)
            if (coachIdHeader) {
                // Verify client is assigned to this coach
                const supabase = getSupabaseClient();
                const { data: assignment } = await supabase
                    .from('coach_client_assignments')
                    .select('coach_id')
                    .eq('client_id', targetClientId)
                    .eq('coach_id', coachIdHeader)
                    .single();

                if (!assignment) {
                    return forbidden(res, { message: 'Not assigned to this coach' });
                }

                targetCoachId = coachIdHeader;
            }
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

        // Get submission counts for all check-ins
        const checkInIds = assignments.map((a: any) => a.id);
        const { data: submissionCounts } = await supabase
            .from('client_checkin_logs')
            .select('assignment_id')
            .eq('client_id', targetClientId)
            .in('assignment_id', checkInIds);

        // Create a map of assignment_id -> count
        const countMap: Record<string, number> = {};
        (submissionCounts || []).forEach((s: any) => {
            countMap[s.assignment_id] = (countMap[s.assignment_id] || 0) + 1;
        });

        const checkins = assignments.map((a: any) => ({
            id: a.id,
            assignment_id: a.id,
            coach_id: a.coach_id,
            name: a.name,
            description: a.description,
            schedule_config: a.schedule_config,
            questions: a.questions,
            status: a.status || 'draft',
            completed_at: a.completed_at,
            assigned_at: a.created_at,
            created_at: a.created_at,
            submission_count: countMap[a.id] || 0,
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
        const { checkInIds, clientIds, name, description, questions, schedule_config, cron_expression } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });

        const targetCoachId = coachIdHeader as string;
        let targetClientIds: string[] = [];

        if (Array.isArray(clientIds) && clientIds.length > 0) {
            targetClientIds = clientIds;
        } else if (clientIdHeader) {
            targetClientIds = [clientIdHeader as string];
        } else {
            return forbidden(res, { message: 'x-client-id header or clientIds body param required' });
        }

        const supabase = getSupabaseClient();

        // Verify Relationships
        const { data: relations, error: relationError } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .in('client_id', targetClientIds);

        if (relationError || !relations || relations.length !== targetClientIds.length) {
            return forbidden(res, { message: 'One or more clients not assigned to this coach' });
        }

        // 1. Private
        if (name) {
            const inserts = targetClientIds.map(cid => ({
                client_id: cid,
                coach_id: targetCoachId,
                name,
                description,
                questions: questions || [],
                schedule_config: schedule_config || null,
                cron_expression: cron_expression || null
            }));

            const { data: checkins, error } = await supabase
                .from('client_checkins')
                .insert(inserts)
                .select();

            if (error) return res.status(500).json({ success: false, message: error.message });
            return created(res, { message: 'Private check-ins created', data: { checkins } });
        }

        // 2. Library
        if (!Array.isArray(checkInIds) || checkInIds.length === 0) return res.status(400).json({ success: false, message: 'checkInIds required' });

        const { data: libraryItems, error: fetchError } = await supabase
            .from('coach_checkins')
            .select('*')
            .in('id', checkInIds);

        if (fetchError) return res.status(500).json({ success: false, message: fetchError.message });
        if (!libraryItems || libraryItems.length === 0) return notFound(res, { message: 'No check-ins found' });

        const assignments: any[] = [];
        for (const cid of targetClientIds) {
            for (const h of libraryItems) {
                const hasQuestions = h.questions && Array.isArray(h.questions) && h.questions.length > 0;
                assignments.push({
                    client_id: cid,
                    coach_id: targetCoachId,
                    name: h.name,
                    description: h.description,
                    questions: h.questions,
                    schedule_config: schedule_config || h.schedule_config,
                    cron_expression: cron_expression || h.cron_expression,
                    status: hasQuestions ? 'live' : 'draft',
                });
            }
        }

        // Deduplication & Renaming
        const { data: existingCheckIns } = await supabase
            .from('client_checkins')
            .select('client_id, name')
            .in('client_id', targetClientIds);

        const existingSet = new Set(
            (existingCheckIns || []).map((c: any) => `${c.client_id}:${c.name}`)
        );

        // Process assignments to ensure unique names
        for (const assignment of assignments) {
            let originalName = assignment.name;
            let checkName = originalName;
            let counter = 1;

            while (existingSet.has(`${assignment.client_id}:${checkName}`)) {
                checkName = `${originalName} ${counter}`;
                counter++;
            }

            assignment.name = checkName;
            existingSet.add(`${assignment.client_id}:${checkName}`);
        }

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
            .select('client_id, coach_id, name')
            .eq('id', id)
            .eq('client_id', targetClientId)
            .single();

        if (detailsError || !assignmentDetails) return notFound(res, { message: 'Assignment not found' });

        // If this is a coach request, verify coach_id matches
        if (isCoach && coachIdHeader !== assignmentDetails.coach_id) {
            return forbidden(res, { message: 'Coach ID mismatch' });
        }

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
            .eq('coach_id', assignmentDetails.coach_id)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        // Send notification for client submissions only
        if (!isCoach) {
            resolveClientName(targetClientId).then((clientName) => {
                if (clientName) {
                    createCoachNotification({
                        coachId: assignmentDetails.coach_id,
                        clientId: targetClientId,
                        notificationType: NOTIFICATION_TYPES.checkin_completed,
                        title: NOTIFICATION_TITLES.checkin_completed,
                        description: `${clientName} completed a check-in`,
                        metadata: { checkin_id: id, name: assignmentDetails.name },
                    });
                }
            });
        }

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

    /**
     * Get a single check-in by ID
     */
    getCheckInById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');

        let targetClientId: string;
        let targetCoachId: string | undefined;

        // Determine request context by matching userId to headers
        const isCoachRequest = coachIdHeader && coachIdHeader === userId;

        if (isCoachRequest) {
            // COACH SCENARIO: Coach accessing client's data
            if (!clientIdHeader) {
                return forbidden(res, { message: 'x-client-id header required for coach requests' });
            }

            targetClientId = clientIdHeader;
            targetCoachId = coachIdHeader;

            // Verify coach-client relationship
            const supabase = getSupabaseClient();
            const { data: relation } = await supabase
                .from('coach_client_assignments')
                .select('client_id')
                .eq('coach_id', targetCoachId)
                .eq('client_id', targetClientId)
                .single();

            if (!relation) {
                return forbidden(res, { message: 'Client not assigned to this coach' });
            }
        } else {
            // CLIENT SCENARIO: Client accessing their own data
            // If x-client-id provided, it must match authenticated user
            if (clientIdHeader && clientIdHeader !== userId) {
                return forbidden(res, { message: 'Cannot access another client\'s data' });
            }

            targetClientId = clientIdHeader || userId;

            // x-coach-id scopes to a specific coach relationship (optional)
            if (coachIdHeader) {
                // Verify client is assigned to this coach
                const supabase = getSupabaseClient();
                const { data: assignment } = await supabase
                    .from('coach_client_assignments')
                    .select('coach_id')
                    .eq('client_id', targetClientId)
                    .eq('coach_id', coachIdHeader)
                    .single();

                if (!assignment) {
                    return forbidden(res, { message: 'Not assigned to this coach' });
                }

                targetCoachId = coachIdHeader;
            }
        }

        const supabase = getSupabaseClient();

        let query = supabase
            .from('client_checkins')
            .select('*')
            .eq('id', id)
            .eq('client_id', targetClientId);

        if (targetCoachId) {
            query = query.eq('coach_id', targetCoachId);
        }

        const { data: checkIn, error } = await query.single();

        if (error || !checkIn) return notFound(res, { message: 'Check-in not found' });

        success(res, {
            message: 'Check-in retrieved successfully',
            data: {
                id: checkIn.id,
                name: checkIn.name,
                description: checkIn.description,
                questions: checkIn.questions || [],
                scheduleConfig: checkIn.schedule_config,
                cronExpression: checkIn.cron_expression,
            },
        });
    },

    /**
     * Update a check-in (questions, etc.)
     */
    updateCheckIn: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { questions, name, description, schedule_config, cron_expression } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Build update object with only provided fields
        const updateData: any = {};
        if (questions !== undefined) updateData.questions = questions;
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (schedule_config !== undefined) updateData.schedule_config = schedule_config;
        if (cron_expression !== undefined) updateData.cron_expression = cron_expression;

        const { data, error } = await supabase
            .from('client_checkins')
            .update(updateData)
            .eq('id', id)
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data) return notFound(res, { message: 'Check-in not found' });

        success(res, {
            message: 'Check-in updated successfully',
            data: {
                id: data.id,
                name: data.name,
                description: data.description,
                questions: data.questions || [],
                scheduleConfig: data.schedule_config,
                cronExpression: data.cron_expression,
            },
        });
    },

    /**
     * Create a client-specific check-in (not from library)
     */
    createCheckIn: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { name, description, questions, schedule_config, cron_expression } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!name) return res.status(400).json({ success: false, message: 'name is required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Verify relationship
        const { data: relation } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .eq('client_id', targetClientId)
            .single();

        if (!relation) return forbidden(res, { message: 'Client not assigned to this coach' });

        // Check for duplicate names and rename if needed
        const { data: existingCheckIns } = await supabase
            .from('client_checkins')
            .select('name')
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId);

        const existingNames = new Set((existingCheckIns || []).map((c: any) => c.name));
        let finalName = name;
        let counter = 1;
        while (existingNames.has(finalName)) {
            finalName = `${name} ${counter}`;
            counter++;
        }

        const { data: checkIn, error } = await supabase
            .from('client_checkins')
            .insert({
                client_id: targetClientId,
                coach_id: targetCoachId,
                name: finalName,
                description: description || '',
                questions: questions || [],
                schedule_config: schedule_config || null,
                cron_expression: cron_expression || null,
            })
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        created(res, {
            message: 'Check-in created successfully',
            data: {
                id: checkIn.id,
                name: checkIn.name,
                description: checkIn.description,
                questions: checkIn.questions || [],
            },
        });
    },

    /**
     * Update check-in status (publish/pause)
     */
    updateCheckInStatus: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { status } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!status || !['live', 'paused'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid status (live/paused) required' });
        }

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('client_checkins')
            .update({ status })
            .eq('id', id)
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data) return notFound(res, { message: 'Check-in not found' });

        success(res, {
            message: `Check-in ${status === 'live' ? 'published' : 'paused'} successfully`,
            data: {
                id: data.id,
                status: data.status,
            },
        });
    },
};
