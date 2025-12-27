import { success, unauthorized, created, notFound, noContent } from '../../../utils/http-response';


import { getSupabaseClient } from '../../../services/supabase.service';

export const clientQuestionnairesController = {
    /**
     * Get all questionnaires assigned to a client
     */
    getQuestionnaires: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_questionnaire_assignments')
            .select('*, questionnaire:coach_questionnaires(*)')
            .eq('client_id', targetClientId);

        if (isCoachView) {
            query = query.eq('coach_id', userId);
        }

        const { data: assignments, error } = await query;

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client questionnaires retrieved successfully',
            data: { assignments },
        });
    },

    /**
     * Submit a questionnaire
     */
    submitQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { responses } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // 1. Fetch assignment details
        const { data: assignmentDetails, error: detailsError } = await supabase
            .from('client_questionnaire_assignments')
            .select('client_id, coach_id, coach_questionnaire_id')
            .eq('id', id)
            .single();

        if (!detailsError && assignmentDetails) {
            // 2. Insert into logs
            await supabase.from('client_questionnaire_logs').insert({
                client_id: userId,
                coach_id: assignmentDetails.coach_id,
                coach_questionnaire_id: assignmentDetails.coach_questionnaire_id,
                responses, // Assuming column exists
                submission_date: new Date().toISOString(), // or created_at
                status: 'completed'
            });
        }

        const { data, error } = await supabase
            .from('client_questionnaire_assignments')
            .update({
                responses,
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('client_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        if (!data) {
            return notFound(res, { message: 'Questionnaire assignment not found' });
        }

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
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { id } = req.params;
        const { questionnaireIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const isCoachView = !!req.header('x-client-id');
        let query = supabase.from('client_questionnaire_assignments').delete();

        if (!isCoachView) {
            return res.status(403).json({ success: false, message: 'Clients cannot delete assignments' });
        }

        let idsToDelete = [];
        if (id) idsToDelete.push(id);
        if (questionnaireIds && Array.isArray(questionnaireIds)) idsToDelete = [...idsToDelete, ...questionnaireIds];

        if (idsToDelete.length === 0) {
            return res.status(400).json({ success: false, message: 'No IDs provided' });
        }

        query = query.in('id', idsToDelete);

        if (isCoachView) {
            query = query.eq('coach_id', userId).eq('client_id', targetClientId);
        }

        const { error } = await query;

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },
};
