import { Request, Response } from 'express';
import { success, unauthorized } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const searchController = {
    /**
     * Global search across all coach resources
     */
    globalSearch: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const query = req.query.q as string;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!query || query.trim().length === 0) {
            success(res, {
                data: {
                    metrics: [],
                    habits: [],
                    files: [],
                    workouts: [],
                    programs: [],
                    exercises: [],
                    sections: [],
                    todosYourList: [],
                    todosAthliAssistant: [],
                    conversations: [],
                    athletes: [],
                    coachCheckIns: [],
                    coachQuestionnaires: [],
                    flows: [],
                    clientHabits: [],
                    clientMetrics: [],
                    clientFiles: [],
                    clientCheckIns: [],
                    clientQuestionnaires: [],
                }
            });
            return;
        }

        const searchTerm = `%${query}%`;
        const supabase = getSupabaseClient();

        // Perform parallel queries
        const [
            metricsResult,
            habitsResult,
            filesResult,
            workoutsResult,
            programsResult,
            exercisesResult,
            sectionsResult,
            todosYourListResult,
            todosAthliAssistantResult,
            conversationsResult,
            clientProfilesResult,
            coachCheckInsResult,
            coachQuestionnairesResult,
            flowsResult,
            clientHabitsResult,
            clientMetricsResult,
            clientFilesResult,
            clientCheckInsResult,
            clientQuestionnairesResult,
        ] = await Promise.all([
            // 1. Coach Metrics
            supabase
                .from('coach_metrics')
                .select('*')
                .eq('coach_id', userId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(5),

            // 2. Coach Habits
            supabase
                .from('coach_habits')
                .select('*')
                .eq('coach_id', userId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(5),

            // 3. Coach Files
            supabase
                .from('coach_files')
                .select('*')
                .eq('coach_id', userId)
                .ilike('filename', searchTerm)
                .limit(5),

            // 4. Coach Workouts
            supabase
                .from('coach_workouts')
                .select('*')
                .eq('coach_id', userId)
                .or(`name.ilike.${searchTerm},type.ilike.${searchTerm}`)
                .limit(5),

            // 5. Coach Programs
            supabase
                .from('coach_programs')
                .select('*')
                .eq('coach_id', userId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(5),

            // 6. Coach Exercises
            supabase
                .from('coach_exercises')
                .select('*')
                .eq('coach_id', userId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`)
                .limit(5),

            // 7. Sections
            supabase
                .from('coach_sections')
                .select('id, name, description, section_type, number_of_exercises')
                .eq('coach_id', userId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},section_type.ilike.${searchTerm}`)
                .limit(5),

            // 8. Own Todos (Your List)
            supabase
                .from('coach_own_todolist')
                .select('id, title, information, type, client_id, due_date, completed')
                .eq('coach_id', userId)
                .or(`title.ilike.${searchTerm},information.ilike.${searchTerm}`)
                .limit(5),

            // 9. Auto Todos (Athli Assistant)
            supabase
                .from('coach_auto_todolist')
                .select('id, title, type, completed')
                .eq('coach_id', userId)
                .ilike('title', searchTerm)
                .limit(5),

            // 10. Conversations - search by client name
            supabase
                .from('conversations')
                .select(`id, client_id, last_message_preview, client:user_profiles!conversations_client_id_fkey(id, name, profile_picture_url)`)
                .eq('coach_id', userId)
                .not('last_message_at', 'is', null)
                .limit(20),

            // 11. All client profiles (for athletes search + client name lookup)
            supabase
                .from('coach_clients_view')
                .select('client_id, full_name, email, avatar_url, category, status')
                .eq('coach_id', userId)
                .eq('is_archived', false),

            // 12. Coach Check-ins
            supabase
                .from('coach_checkins')
                .select('id, name, description')
                .eq('coach_id', userId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(5),

            // 13. Coach Questionnaires
            supabase
                .from('coach_questionnaires')
                .select('id, name, description')
                .eq('coach_id', userId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(5),

            // 14. Coach Flows
            supabase
                .from('coach_flows')
                .select('id, name, description')
                .eq('coach_id', userId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(5),

            // 15. Client Habits (renamed from client_habit_assignments, data is now inline)
            supabase
                .from('client_habits')
                .select('id, client_id, name, description')
                .eq('coach_id', userId)
                .limit(50),

            // 16. Client Metrics
            supabase
                .from('client_metrics')
                .select('id, client_id, name, unit, description')
                .eq('coach_id', userId)
                .limit(50),

            // 17. Client Files
            supabase
                .from('client_files')
                .select('id, client_id, filename')
                .eq('coach_id', userId)
                .limit(50),

            // 18. Client Check-ins
            supabase
                .from('client_checkins')
                .select('id, client_id, name, description')
                .eq('coach_id', userId)
                .limit(50),

            // 19. Client Questionnaires
            supabase
                .from('client_questionnaires')
                .select('id, client_id, name, description')
                .eq('coach_id', userId)
                .limit(50),
        ]);

        const searchTermLower = query.toLowerCase();

        // Build client name lookup map from coach_clients_view
        const clientNameMap = new Map<string, { name: string; email: string; avatar_url: string }>();
        for (const cp of clientProfilesResult.data || []) {
            clientNameMap.set(cp.client_id, {
                name: cp.full_name || '',
                email: cp.email || '',
                avatar_url: cp.avatar_url || '',
            });
        }

        // Filter conversations by client name
        const filteredConversations = (conversationsResult.data || []).filter((conv: any) => {
            const clientName = conv.client?.name || '';
            return clientName.toLowerCase().includes(searchTermLower);
        }).slice(0, 5);

        // Filter athletes by client name/email
        const filteredAthletes = (clientProfilesResult.data || []).filter((a: any) => {
            const name = (a.full_name || '').toLowerCase();
            const email = (a.email || '').toLowerCase();
            return name.includes(searchTermLower) || email.includes(searchTermLower);
        }).slice(0, 5).map((a: any) => ({
            client_id: a.client_id,
            name: a.full_name,
            email: a.email,
            profile_picture_url: a.avatar_url,
            category: a.category,
            status: a.status,
        }));

        // Filter client assignments by item name OR client name, and enrich with client name
        const filterAndMapAssignments = (
            data: any[] | null,
            getItemFields: (item: any) => { name: string; description?: string; unit?: string }
        ) => {
            return (data || []).filter((item: any) => {
                const fields = getItemFields(item);
                const itemName = (fields.name || '').toLowerCase();
                const clientInfo = clientNameMap.get(item.client_id);
                const clientName = (clientInfo?.name || '').toLowerCase();
                return itemName.includes(searchTermLower) || clientName.includes(searchTermLower);
            }).slice(0, 10).map((item: any) => {
                const fields = getItemFields(item);
                const clientInfo = clientNameMap.get(item.client_id);
                return {
                    id: item.id,
                    client_id: item.client_id,
                    name: fields.name,
                    description: fields.description,
                    unit: fields.unit,
                    client_name: clientInfo?.name || 'Unknown',
                    avatar_url: clientInfo?.avatar_url || '',
                };
            });
        };

        const filteredClientHabits = filterAndMapAssignments(
            clientHabitsResult.data,
            (item) => ({ name: item.name, description: item.description })
        );

        const filteredClientMetrics = filterAndMapAssignments(
            clientMetricsResult.data,
            (item) => ({ name: item.name, unit: item.unit, description: item.description })
        );

        const filteredClientFiles = filterAndMapAssignments(
            clientFilesResult.data,
            (item) => ({ name: item.filename })
        );

        const filteredClientCheckIns = filterAndMapAssignments(
            clientCheckInsResult.data,
            (item) => ({ name: item.name, description: item.description })
        );

        const filteredClientQuestionnaires = filterAndMapAssignments(
            clientQuestionnairesResult.data,
            (item) => ({ name: item.name, description: item.description })
        );

        success(res, {
            message: 'Search results retrieved',
            data: {
                metrics: metricsResult.data || [],
                habits: habitsResult.data || [],
                files: filesResult.data || [],
                workouts: workoutsResult.data || [],
                programs: programsResult.data || [],
                exercises: exercisesResult.data || [],
                sections: sectionsResult.data || [],
                todosYourList: todosYourListResult.data || [],
                todosAthliAssistant: todosAthliAssistantResult.data || [],
                conversations: filteredConversations,
                athletes: filteredAthletes,
                coachCheckIns: coachCheckInsResult.data || [],
                coachQuestionnaires: coachQuestionnairesResult.data || [],
                flows: flowsResult.data || [],
                clientHabits: filteredClientHabits,
                clientMetrics: filteredClientMetrics,
                clientFiles: filteredClientFiles,
                clientCheckIns: filteredClientCheckIns,
                clientQuestionnaires: filteredClientQuestionnaires,
            },
        });
    }
};
