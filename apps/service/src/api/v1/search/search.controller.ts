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
            conversationsResult
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
                .limit(5), // removed type/equipment if not consistent, but migration 017 added type/equipment text/text[]

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
        ]);

        // Check for errors (optional: log them, but return partial results or empty arrays)
        // For simplicity, we assume successful queries or just return empty if error/null

        // Filter conversations by client name (since Supabase can't ilike on joined fields)
        const searchTermLower = query.toLowerCase();
        const filteredConversations = (conversationsResult.data || []).filter((conv: any) => {
            const clientName = conv.client?.name || '';
            return clientName.toLowerCase().includes(searchTermLower);
        }).slice(0, 5);

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
            },
        });
    }
};
