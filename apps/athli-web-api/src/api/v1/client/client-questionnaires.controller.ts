import { Request, Response } from 'express';
import { success, unauthorized, created, notFound, noContent, forbidden } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientQuestionnairesController = {
    /**
     * Get all questionnaires assigned to a client
     */
    getQuestionnaires: async (req: Request, res: Response) => {
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
            .from('client_questionnaires')
            .select('*')
            .eq('client_id', targetClientId);

        if (targetCoachId) {
            query = query.eq('coach_id', targetCoachId);
        }

        const { data: assignments, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });

        const questionnaires = assignments.map((a: any) => ({
            id: a.id,
            assignment_id: a.id,
            coach_id: a.coach_id,
            name: a.name,
            description: a.description,
            questions: a.questions,
            status: a.status,
            completed_at: a.completed_at,
            assigned_at: a.created_at,
            created_at: a.created_at
        }));

        success(res, {
            message: 'Client questionnaires retrieved successfully',
            data: { questionnaires },
        });
    },

    /**
     * Assign questionnaires (Library or Private) (Coach Only)
     */
    /**
     * Assign questionnaires (Library or Private) (Coach Only)
     */
    assignQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { questionnaireIds, clientIds, name, description, questions } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });

        // Determine target clients
        let targetClientIds: string[] = [];
        if (Array.isArray(clientIds) && clientIds.length > 0) {
            targetClientIds = clientIds;
        } else if (clientIdHeader) {
            targetClientIds = [clientIdHeader as string];
        } else {
            return forbidden(res, { message: 'x-client-id header or clientIds body param required' });
        }

        const targetCoachId = coachIdHeader as string;
        const supabase = getSupabaseClient();

        // Verify Relations for all clients
        const { data: relations, error: relationError } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .in('client_id', targetClientIds);

        if (relationError || !relations || relations.length !== targetClientIds.length) {
            return forbidden(res, { message: 'One or more clients are not assigned to this coach' });
        }

        // 1. Private Questionnaire Creation (Single Client usually, but we can support bulk if needed)
        if (name) {
            const assignmentsToInsert: any[] = [];

            // Fetch existing questionnaires for renaming check (only name matters for private)
            const { data: existingItems } = await supabase
                .from('client_questionnaires')
                .select('client_id, name')
                .in('client_id', targetClientIds);

            // Track names used in this batch and existing ones
            const usedNames = new Set<string>();
            existingItems?.forEach(item => usedNames.add(`${item.client_id}:${item.name}`));

            for (const clientId of targetClientIds) {
                let finalName = name;
                let counter = 1;
                while (usedNames.has(`${clientId}:${finalName}`)) {
                    finalName = `${name} ${counter}`;
                    counter++;
                }
                usedNames.add(`${clientId}:${finalName}`);

                assignmentsToInsert.push({
                    client_id: clientId,
                    coach_id: targetCoachId,
                    name: finalName,
                    description,
                    questions: questions || [],
                });
            }

            const { data: createdItems, error } = await supabase
                .from('client_questionnaires')
                .insert(assignmentsToInsert)
                .select();

            if (error) return res.status(500).json({ success: false, message: error.message });
            return created(res, { message: 'Private questionnaire(s) created', data: { questionnaires: createdItems } });
        }

        // 2. Library Assignment
        if (!Array.isArray(questionnaireIds) || questionnaireIds.length === 0) return res.status(400).json({ success: false, message: 'questionnaireIds required' });

        const { data: libraryItems, error: fetchError } = await supabase
            .from('coach_questionnaires')
            .select('*')
            .in('id', questionnaireIds);

        if (fetchError) return res.status(500).json({ success: false, message: fetchError.message });
        if (!libraryItems || libraryItems.length === 0) return notFound(res, { message: 'No questionnaires found' });

        // Fetch existing assignments for renaming
        const { data: existingAssignments } = await supabase
            .from('client_questionnaires')
            .select('client_id, name')
            .in('client_id', targetClientIds);

        // Map for fast lookup: "clientId:itemName" -> true
        const existingMap = new Set<string>();
        if (existingAssignments) {
            existingAssignments.forEach((h: any) => existingMap.add(`${h.client_id}:${h.name}`));
        }

        const newAssignments: any[] = [];
        // Track names assigned IN THIS BATCH to prevent conflicts within the batch itself
        const batchMap = new Set<string>();

        // Cross-join clients * questionnaires
        for (const clientId of targetClientIds) {
            for (const item of libraryItems) {
                // Renaming Logic
                let finalName = item.name;
                let counter = 1;

                // Check against DB existing items AND items we are about to insert in this batch
                while (
                    existingMap.has(`${clientId}:${finalName}`) ||
                    batchMap.has(`${clientId}:${finalName}`)
                ) {
                    finalName = `${item.name} ${counter}`;
                    counter++;
                }

                // Lock this name for this batch
                batchMap.add(`${clientId}:${finalName}`);

                newAssignments.push({
                    client_id: clientId,
                    coach_id: targetCoachId,
                    name: finalName,
                    description: item.description,
                    questions: item.questions,
                    // Store reference to library item if desired, but schema might not have it. 
                    // Based on other controllers, we often just copy values.
                });
            }
        }

        if (newAssignments.length === 0) {
            return success(res, { message: 'No new questionnaires to assign (all duplicates skipped or empty)' });
        }

        const { error: insertError } = await supabase.from('client_questionnaires').insert(newAssignments);
        if (insertError) return res.status(500).json({ success: false, message: insertError.message });

        created(res, { message: 'Questionnaires assigned successfully' });
    },

    /**
     * Submit a questionnaire
     */
    submitQuestionnaire: async (req: Request, res: Response) => {
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
            .from('client_questionnaires')
            .select('client_id, coach_id')
            .eq('id', id)
            .eq('client_id', targetClientId)
            .single();

        if (detailsError || !assignmentDetails) return notFound(res, { message: 'Assignment not found' });

        // If this is a coach request, verify coach_id matches
        if (isCoach && coachIdHeader !== assignmentDetails.coach_id) {
            return forbidden(res, { message: 'Coach ID mismatch' });
        }

        // 2. Insert into logs
        await supabase.from('client_questionnaire_logs').insert({
            client_id: targetClientId,
            coach_id: assignmentDetails.coach_id,
            assignment_id: id,
            answers: responses,
            submission_date: new Date().toISOString(),
            status: 'completed'
        });

        const { data, error } = await supabase
            .from('client_questionnaires')
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

        success(res, {
            message: 'Questionnaire submitted successfully',
            data: { assignment: data },
        });
    },

    /**
     * Delete (unassign) a questionnaire
     */
    deleteAssignment: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { questionnaireIds } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!Array.isArray(questionnaireIds)) return res.status(400).json({ success: false, message: 'questionnaireIds array required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('client_questionnaires')
            .delete()
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .in('id', questionnaireIds);

        if (error) return res.status(500).json({ success: false, message: error.message });
        noContent(res);
    },
};
