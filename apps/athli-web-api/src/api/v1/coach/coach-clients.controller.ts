import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { avatarService } from '../../../services/avatar.service';
import * as crypto from 'crypto';

export const coachClientController = {
    /**
     * Get all clients for a coach
     */
    getClients: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: clients, error } = await supabase
            .from('coach_clients_view')
            .select('*')
            .eq('coach_id', userId)
            .eq('is_active', true);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach clients retrieved successfully',
            data: { clients },
        });
    },

    /**
     * Get a single client by ID
     */
    getClient: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Use the view which joins profiles + assignments
        const { data: client, error } = await supabase
            .from('coach_clients_view')
            .select('*')
            .eq('coach_id', userId)
            .eq('client_id', id)
            .single();

        if (error || !client) {
            if (error?.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
                console.error('Error fetching client:', error);
                return res.status(500).json({ success: false, message: error?.message || 'Error fetching client' });
            }
            return notFound(res, { message: 'Client not found' });
        }

        success(res, {
            message: 'Client retrieved successfully',
            data: { client },
        });
    },

    /**
     * Get assigned metrics for a client
     */
    getClientMetrics: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Fetch assignments joined with metric details
        const { data: assignments, error } = await supabase
            .from('client_metric_assignments')
            .select(`
                *,
                metric:coach_metrics!inner(*)
            `)
            .eq('client_id', id)
            .eq('coach_id', userId) // Security check: Ensure coach owns the assignment context
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Transform to flat structure if needed, or keep as assignments
        const metrics = assignments.map((a: any) => ({
            ...a.metric,
            assignment_id: a.id,
            sort_order: a.sort_order
        }));

        success(res, {
            message: 'Client metrics retrieved successfully',
            data: { metrics },
        });
    },

    /**
     * Get assigned habits for a client
     */
    getClientHabits: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { data: assignments, error } = await supabase
            .from('client_habit_assignments')
            .select(`
                *,
                habit:coach_habits!inner(*)
            `)
            .eq('client_id', id)
            .eq('coach_id', userId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        const habits = assignments.map((a: any) => ({
            ...a.habit,
            assignment_id: a.id,
            sort_order: a.sort_order,
            custom_schedule: a.custom_schedule // Included if overridden
        }));

        success(res, {
            message: 'Client habits retrieved successfully',
            data: { habits },
        });
    },

    /**
     * Get assigned files for a client
     */
    getClientFiles: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { data: assignments, error } = await supabase
            .from('client_file_assignments')
            .select(`
                *,
                file:coach_files!inner(*)
            `)
            .eq('client_id', id)
            .eq('coach_id', userId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        const files = assignments.map((a: any) => ({
            ...a.file,
            assignment_id: a.id,
            sort_order: a.sort_order,
            display_name: a.display_name // Override name
        }));

        success(res, {
            message: 'Client files retrieved successfully',
            data: { files },
        });
    },

    /**
     * Create/Invite one or more new clients
     */
    createClients: async (req: Request, res: Response) => {
        const coachId = (req as any).userId;
        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const body = req.body;
        const clientsToCreate = Array.isArray(body) ? body : [body];
        const supabase = getSupabaseClient();
        const results = [];
        let lastError: string | null = null;

        for (const clientData of clientsToCreate) {
            const { email, firstName, lastName, category = 'online' } = clientData;
            const fullName = `${firstName} ${lastName}`.trim();

            try {
                // 0. Generate a unique 8-character alphanumeric invitation token
                const invitationToken = crypto.randomBytes(4).toString('hex').slice(0, 8).toUpperCase();

                // 1. Check if any profiles exist for this email to get the clientId
                const { data: profiles, error: profileFetchError } = await supabase
                    .from('user_profiles')
                    .select('id, user_type')
                    .eq('email', email);

                if (profileFetchError) throw profileFetchError;

                let clientId: string | undefined = profiles?.[0]?.id;
                let hasClientProfile = profiles?.some(p => p.user_type === 'client');

                if (!clientId) {
                    // 2. No profile exists, try to create the user in auth.users
                    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                        email,
                        email_confirm: true,
                        user_metadata: {
                            name: fullName,
                            user_type: 'client'
                        }
                    });

                    if (createError) {
                        if (createError.message.toLowerCase().includes('already exists')) {
                            // User exists in auth but not in user_profiles
                            // We need to find their ID. Since we can't easily query auth.users,
                            // we'll use listUsers as a fallback.
                            const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
                            if (listError) throw listError;

                            const existingUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                            if (!existingUser) throw new Error('User supposedly exists but could not be found');

                            clientId = existingUser.id;
                        } else {
                            throw createError;
                        }
                    } else {
                        clientId = newUser.user.id;
                        hasClientProfile = true; // Trigger handles user_profiles creation

                        // Generate default avatar for new invited client
                        try {
                            const avatarUrl = await avatarService.generateDefaultAvatar(clientId, fullName);
                            await supabase
                                .from('user_profiles')
                                .update({ profile_picture_url: avatarUrl })
                                .eq('id', clientId);
                        } catch (avatarErr) {
                            console.error('Failed to generate default avatar during client creation:', avatarErr);
                        }
                    }
                }

                if (!clientId) throw new Error('Could not determine clientId');

                if (!hasClientProfile) {
                    // 3. User exists but doesn't have a 'client' profile record
                    const { error: profileError } = await supabase
                        .from('user_profiles')
                        .upsert({
                            id: clientId,
                            user_type: 'client',
                            email,
                            name: fullName,
                            signin_method: 'email'
                        }, { onConflict: 'id, user_type' });

                    if (profileError) throw profileError;
                }

                // 4. Ensure client_profiles entry exists
                // Note: category, status, and coach_id have been moved to coach_client_assignments
                const { error: clientProfileError } = await supabase
                    .from('client_profiles')
                    .upsert({
                        client_id: clientId,
                    }, { onConflict: 'client_id' });

                if (clientProfileError) throw clientProfileError;

                // 5. Ensure coach_client_assignments entry exists (many-to-many)
                const { error: assignmentError } = await supabase
                    .from('coach_client_assignments')
                    .upsert({
                        coach_id: coachId,
                        client_id: clientId,
                        category,
                        status: 'invited',
                        invitation_token: invitationToken
                    }, { onConflict: 'coach_id, client_id' });

                if (assignmentError) throw assignmentError;

                // TODO: Email invitation service integration here

                results.push(clientId);
            } catch (err: any) {
                console.error(`Failed to handle client ${email}:`, err);
                lastError = err.message || JSON.stringify(err);
                // Continue with next client
            }
        }

        if (results.length === 0 && clientsToCreate.length > 0) {
            return res.status(500).json({
                success: false,
                message: lastError ? `Failed to create any clients: ${lastError}` : 'Failed to create any clients'
            });
        }

        // Fetch the newly created/assigned clients from the view to return consistent data
        const { data: clients, error: fetchError } = await supabase
            .from('coach_clients_view')
            .select('*')
            .in('client_id', results)
            .eq('coach_id', coachId);

        if (fetchError) {
            return res.status(500).json({ success: false, message: fetchError.message });
        }

        created(res, {
            message: `${clients.length} clients handled successfully`,
            data: { clients },
        });
    },

    /**
     * Update client details or status
     */
    updateClient: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // 1. Separate assignment updates from profile updates
        const assignmentFields = ['category', 'status', 'is_active', 'is_archived'];
        const profileFields = ['first_name', 'last_name', 'phone', 'gender', 'country', 'city', 'birth_date', 'height_cm', 'weight_kg', 'unit_system'];

        const assignmentUpdates: any = {};
        const profileUpdates: any = {};

        // Populate update objects based on allowed fields
        Object.keys(updates).forEach(key => {
            if (assignmentFields.includes(key)) {
                assignmentUpdates[key] = updates[key];
            } else if (profileFields.includes(key)) {
                // Map birth_date to date_of_birth if needed
                if (key === 'birth_date') {
                    profileUpdates['date_of_birth'] = updates[key];
                } else {
                    profileUpdates[key] = updates[key];
                }
            }
        });


        // 2. Update assignment if needed
        if (Object.keys(assignmentUpdates).length > 0) {
            const { error: assignmentError } = await supabase
                .from('coach_client_assignments')
                .update(assignmentUpdates)
                .eq('client_id', id)
                .eq('coach_id', userId);

            if (assignmentError) throw assignmentError;
        }

        // 3. Update profile if needed
        if (Object.keys(profileUpdates).length > 0) {
            // First update user_profiles if name changed
            if (profileUpdates.first_name || profileUpdates.last_name) {
                const { data: currentProfile } = await supabase
                    .from('user_profiles')
                    .select('name')
                    .eq('id', id)
                    .single();

                const names = (currentProfile?.name || '').split(' ');
                const firstName = profileUpdates.first_name || names[0] || '';
                const lastName = profileUpdates.last_name || names.slice(1).join(' ') || '';
                const newFullName = `${firstName} ${lastName}`.trim();

                await supabase
                    .from('user_profiles')
                    .update({ name: newFullName })
                    .eq('id', id);
            }

            // Update client_profiles
            const { error: profileError } = await supabase
                .from('client_profiles')
                .update(profileUpdates)
                .eq('client_id', id);

            if (profileError) throw profileError;
        }

        // 4. Fetch the updated view for return data
        const { data: client, error: fetchError } = await supabase
            .from('coach_clients_view')
            .select('*')
            .eq('coach_id', userId)
            .eq('client_id', id)
            .single();

        if (fetchError || !client) {
            return notFound(res, { message: 'Client not found after update' });
        }

        success(res, {
            message: 'Client updated successfully',
            data: { client },
        });
    },

    /**
     * Delete client assignment (remove client from coach)
     */
    deleteClient: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_client_assignments')
            .delete()
            .eq('client_id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },

    /**
     * Assign one or more files to a client
     */
    assignFiles: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id
        const { fileIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ success: false, message: 'fileIds array is required' });
        }

        const supabase = getSupabaseClient();

        // Prepare assignment objects
        // TODO: Handle sort_order if needed, for now just append
        const assignments = fileIds.map(fileId => ({
            coach_id: userId,
            client_id: id,
            file_id: fileId,
            is_active: true
        }));

        const { error } = await supabase
            .from('client_file_assignments')
            .upsert(assignments, { onConflict: 'client_id, file_id' }); // Assuming there's a unique constraint/index

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, { message: 'Files assigned successfully' });
    },

    /**
     * Remove one or more files from a client
     */
    removeFiles: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id
        const { fileIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ success: false, message: 'fileIds array is required' });
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('client_file_assignments')
            .delete()
            .eq('client_id', id)
            .eq('coach_id', userId)
            .in('file_id', fileIds);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, { message: 'Files removed successfully' });
    },

    /**
     * Assign one or more metrics to a client
     */
    assignMetrics: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id
        const { metricIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!Array.isArray(metricIds) || metricIds.length === 0) {
            return res.status(400).json({ success: false, message: 'metricIds array is required' });
        }

        const supabase = getSupabaseClient();

        const assignments = metricIds.map(metricId => ({
            coach_id: userId,
            client_id: id,
            metric_id: metricId,
            is_active: true
        }));

        const { error } = await supabase
            .from('client_metric_assignments')
            .upsert(assignments, { onConflict: 'client_id, metric_id' });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, { message: 'Metrics assigned successfully' });
    },

    /**
     * Remove one or more metrics from a client
     */
    removeMetrics: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id
        const { metricIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!Array.isArray(metricIds) || metricIds.length === 0) {
            return res.status(400).json({ success: false, message: 'metricIds array is required' });
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('client_metric_assignments')
            .delete()
            .eq('client_id', id)
            .eq('coach_id', userId)
            .in('metric_id', metricIds);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, { message: 'Metrics removed successfully' });
    },

    /**
     * Assign one or more habits to a client
     */
    assignHabits: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id
        const { habitIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!Array.isArray(habitIds) || habitIds.length === 0) {
            return res.status(400).json({ success: false, message: 'habitIds array is required' });
        }

        const supabase = getSupabaseClient();

        const assignments = habitIds.map(habitId => ({
            coach_id: userId,
            client_id: id,
            habit_id: habitId,
            is_active: true
        }));

        const { error } = await supabase
            .from('client_habit_assignments')
            .upsert(assignments, { onConflict: 'client_id, habit_id' });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, { message: 'Habits assigned successfully' });
    },

    /**
     * Remove one or more habits from a client
     */
    removeHabits: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id
        const { habitIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!Array.isArray(habitIds) || habitIds.length === 0) {
            return res.status(400).json({ success: false, message: 'habitIds array is required' });
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('client_habit_assignments')
            .delete()
            .eq('client_id', id)
            .eq('coach_id', userId)
            .in('habit_id', habitIds);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, { message: 'Habits removed successfully' });
    },
    /**
     * Get assigned check-ins for a client
     */
    getClientCheckIns: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { data: assignments, error } = await supabase
            .from('client_checkin_assignments')
            .select(`
                *,
                checkin:coach_checkins!inner(*)
            `)
            .eq('client_id', id)
            .eq('coach_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        const checkIns = assignments.map((a: any) => ({
            ...a.checkin,
            assignment_id: a.id,
            schedule_config: a.schedule_config, // Assignment specific schedule
            cron_expression: a.cron_expression,
            is_active: a.is_active
        }));

        success(res, {
            message: 'Client check-ins retrieved successfully',
            data: { checkIns },
        });
    },

    /**
     * Get assigned questionnaires for a client
     */
    getClientQuestionnaires: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { data: assignments, error } = await supabase
            .from('client_questionnaire_assignments')
            .select(`
                *,
                questionnaire:coach_questionnaires!inner(*)
            `)
            .eq('client_id', id)
            .eq('coach_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        const questionnaires = assignments.map((a: any) => ({
            ...a.questionnaire,
            assignment_id: a.id,
            status: a.status,
            assigned_at: a.created_at,
            completed_at: a.completed_at
        }));

        success(res, {
            message: 'Client questionnaires retrieved successfully',
            data: { questionnaires },
        });
    },
    /**
     * Remove one or more check-ins from a client
     */
    removeCheckIns: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id
        const { checkInIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!Array.isArray(checkInIds) || checkInIds.length === 0) {
            return res.status(400).json({ success: false, message: 'checkInIds array is required' });
        }

        const supabase = getSupabaseClient();

        // Note: checkInIds here are assignment IDs, or checkin IDs? 
        // Typically for removal we use the assignment ID, but the endpoint receives checkInIds (which might be assignment IDs or original form IDs).
        // Let's assume they are ASSIGNMENT IDs for precision, OR we delete by matching checkin_id.
        // The mock/frontend usually sends the ID from the list. 
        // In getClientCheckIns, we mapped `id: assignment_id`. So the frontend sends ASSIGNMENT IDs.

        const { error } = await supabase
            .from('client_checkin_assignments')
            .delete()
            .eq('client_id', id)
            .eq('coach_id', userId)
            .in('id', checkInIds);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, { message: 'Check-ins removed successfully' });
    },

    /**
     * Remove one or more questionnaires from a client
     */
    removeQuestionnaires: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id
        const { questionnaireIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!Array.isArray(questionnaireIds) || questionnaireIds.length === 0) {
            return res.status(400).json({ success: false, message: 'questionnaireIds array is required' });
        }

        const supabase = getSupabaseClient();

        // Similarly, frontend sends assignment IDs
        const { error } = await supabase
            .from('client_questionnaire_assignments')
            .delete()
            .eq('client_id', id)
            .eq('coach_id', userId)
            .in('id', questionnaireIds);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, { message: 'Questionnaires removed successfully' });
    },

    /**
     * Get all archived clients for a coach
     */
    getArchivedClients: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: clients, error } = await supabase
            .from('coach_clients_view')
            .select('*')
            .eq('coach_id', userId)
            .eq('is_archived', true);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Archived clients retrieved successfully',
            data: { clients },
        });
    },

    /**
     * Restore an archived client
     */
    restoreClient: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // client_id

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Verify the client belongs to this coach
        const { data: assignment, error: assignmentError } = await supabase
            .from('coach_client_assignments')
            .select('*')
            .eq('coach_id', userId)
            .eq('client_id', id)
            .single();

        if (assignmentError || !assignment) {
            return notFound(res, { message: 'Client not found or not assigned to this coach' });
        }

        // Update user_profiles to restore the client
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
                status: 'active',
                is_archived: false,
            })
            .eq('id', id);

        if (updateError) {
            return res.status(500).json({ success: false, message: updateError.message });
        }

        // TODO: Client email invite logic to be implemented
        // Send re-invitation email to the restored client

        success(res, { message: 'Client restored successfully' });
    },
};
