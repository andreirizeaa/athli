import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { avatarService } from '../../../services/avatar.service';
import * as crypto from 'crypto';

const getActingCoachId = (req: Request): string | null => {
    return (req.header('x-coach-id') as string) || (req as any).userId || null;
};

export const coachClientController = {
    /**
     * Get all clients for a coach
     */
    getClients: async (req: Request, res: Response) => {
        const coachId = getActingCoachId(req);
        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: clients, error } = await supabase
            .from('coach_clients_view')
            .select('*')
            .eq('coach_id', coachId)
            // Show only active and unarchived clients in the main list
            .eq('is_active', true)
            .eq('is_archived', false);

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
        const coachId = getActingCoachId(req);
        const clientId = req.header('x-client-id');

        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!clientId) {
            return res.status(400).json({ success: false, message: 'x-client-id header is required' });
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);

        if (!isUuid) {
            return res.status(400).json({ success: false, message: 'Invalid ID format in x-client-id header' });
        }

        const supabase = getSupabaseClient();
        const query = supabase
            .from('coach_clients_view')
            .select('*')
            .eq('coach_id', coachId)
            .eq('client_id', clientId);

        const { data: client, error } = await query.single();

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
     * Create/Invite one or more new clients
     */
    createClients: async (req: Request, res: Response) => {
        const coachId = getActingCoachId(req);
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
            const { email: rawEmail, firstName, lastName, category = 'online' } = clientData;
            const email = rawEmail.toLowerCase().trim();
            const fullName = `${firstName} ${lastName}`.trim();

            try {
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
                        const errorMsg = createError.message.toLowerCase();
                        if (errorMsg.includes('already exists') || errorMsg.includes('already registered')) {
                            // User exists in auth but not in user_profiles
                            // We need to find their ID.
                            const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
                            if (listError) throw listError;

                            const existingUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                            if (!existingUser) throw new Error(`User ${email} supposedly exists but could not be found`);

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

                // 2.5 Check if assignment already exists for this coach and client
                const { data: existingAssignment, error: checkError } = await supabase
                    .from('coach_client_assignments')
                    .select('client_id')
                    .eq('coach_id', coachId)
                    .eq('client_id', clientId)
                    .maybeSingle();

                if (checkError) throw checkError;

                if (existingAssignment) {
                    // Assignment already exists, just add to results and continue
                    results.push(clientId);
                    continue;
                }

                // 3. User exists but doesn't have a 'client' profile record
                if (!hasClientProfile) {
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
                const { error: clientProfileError } = await supabase
                    .from('client_profiles')
                    .upsert({
                        client_id: clientId,
                    }, { onConflict: 'client_id' });

                if (clientProfileError) throw clientProfileError;

                // 5. Ensure coach_client_assignments entry exists (many-to-many)
                const invitationToken = crypto.randomBytes(4).toString('hex').slice(0, 8).toUpperCase();
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
        const coachId = getActingCoachId(req);
        // req.body might be empty if only file is sent or it might contain fields
        const { id } = req.body;
        const updates = req.body;
        const file = req.file;

        try {
            if (!coachId) {
                unauthorized(res, { message: 'User not authenticated' });
                return;
            }

            if (!id && !updates.id) {
                return res.status(400).json({ success: false, message: 'Client ID is required' });
            }

            const targetClientId = id || updates.id;
            const supabase = getSupabaseClient();

            // 1. Separate assignment updates from profile updates
            const assignmentFields = ['category', 'status', 'is_archived'];
            const profileFields = ['name', 'phone', 'gender', 'country', 'birth_date', 'unit_system', 'height_cm'];

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

            // 1.5 Handle file upload if present
            if (file) {
                const avatarUrl = await avatarService.uploadAvatar(targetClientId, file as any);
                profileUpdates.profile_picture_url = avatarUrl;
            }

            // 2. Update assignment if needed
            if (Object.keys(assignmentUpdates).length > 0) {
                const { error: assignmentError } = await supabase
                    .from('coach_client_assignments')
                    .update(assignmentUpdates)
                    .eq('client_id', targetClientId)
                    .eq('coach_id', coachId);

                if (assignmentError) throw assignmentError;
            }

            // 3. Update profile if needed
            if (Object.keys(profileUpdates).length > 0) {
                // First update user_profiles if name or avatar changed
                const userProfileUpdates: any = {};
                if (profileUpdates.name) userProfileUpdates.name = profileUpdates.name;
                if (profileUpdates.profile_picture_url) userProfileUpdates.profile_picture_url = profileUpdates.profile_picture_url;

                if (Object.keys(userProfileUpdates).length > 0) {
                    await supabase
                        .from('user_profiles')
                        .update(userProfileUpdates)
                        .eq('id', targetClientId);

                    delete profileUpdates.name; // Don't try to update name in client_profiles
                }

                // Update client_profiles
                if (Object.keys(profileUpdates).length > 0) {
                    const { error: profileError } = await supabase
                        .from('client_profiles')
                        .update(profileUpdates)
                        .eq('client_id', targetClientId);

                    if (profileError) throw profileError;
                }
            }

            // 4. Fetch the updated view for return data
            const { data: client, error: fetchError } = await supabase
                .from('coach_clients_view')
                .select('*')
                .eq('coach_id', coachId)
                .eq('client_id', targetClientId)
                .single();

            if (fetchError || !client) {
                return notFound(res, { message: 'Client not found after update' });
            }

            success(res, {
                message: 'Client updated successfully',
                data: { client },
            });
        } catch (error: any) {
            console.error('Error updating client:', error);
            return res.status(500).json({ success: false, message: error.message || 'Failed to update client' });
        }
    },

    /**
     * Delete client assignment (remove client from coach)
     * Performs a comprehensive cleanup of all associated data.
     */
    deleteClient: async (req: Request, res: Response) => {
        const coachId = getActingCoachId(req);
        const { id } = req.body;

        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Client ID is required' });
        }

        const supabase = getSupabaseClient();

        // Helper to run deletions in parallel where possible, but we'll do sequential for safety and clarity first
        // 1. Assignments
        const assignmentsTables = [
            'client_metric_assignments',
            'client_habit_assignments',
            'client_file_assignments',
            'client_checkin_assignments',
            'client_questionnaire_assignments'
        ];

        // 2. Logs
        const logsTables = [
            'client_metric_entries',
            'client_habit_logs',
            'client_checkin_logs',
            'client_questionnaire_logs',
            'client_photo_logs'
        ];

        // 3. Private Data
        const privateDataTables = [
            'client_bio',
            'client_goals',
            'client_injuries',
            'client_notes'
        ];

        // 4. Todo Lists
        const todoTables = [
            'coach_own_todolist',
            'coach_auto_todolist'
        ];

        try {
            // Delete Assignments
            for (const table of assignmentsTables) {
                await supabase.from(table).delete().eq('client_id', id).eq('coach_id', coachId);
            }

            // Delete Logs
            for (const table of logsTables) {
                await supabase.from(table).delete().eq('client_id', id).eq('coach_id', coachId);
            }

            // Delete Private Data
            for (const table of privateDataTables) {
                await supabase.from(table).delete().eq('client_id', id).eq('coach_id', coachId);
            }

            // Delete Todo Lists
            for (const table of todoTables) {
                await supabase.from(table).delete().eq('client_id', id).eq('coach_id', coachId);
            }

            // 5. Finally delete the main assignment
            const { error } = await supabase
                .from('coach_client_assignments')
                .delete()
                .eq('client_id', id)
                .eq('coach_id', coachId);

            if (error) {
                throw error;
            }

            noContent(res);
        } catch (error: any) {
            console.error('Error deleting client data:', error);
            return res.status(500).json({ success: false, message: error.message || 'Failed to delete client data' });
        }
    },

    /**
     * Get all archived clients for a coach
     */
    getArchivedClients: async (req: Request, res: Response) => {
        const coachId = getActingCoachId(req);
        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: clients, error } = await supabase
            .from('coach_clients_view')
            .select('*')
            .eq('coach_id', coachId)
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
        const coachId = getActingCoachId(req);
        const { clientIds } = req.body; // Expect array of client IDs

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return res.status(400).json({ success: false, message: 'clientIds array is required' });
        }

        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Verify all clients belong to this coach
        const { data: assignments, error: assignmentError } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', coachId)
            .in('client_id', clientIds);

        if (assignmentError) {
            return res.status(500).json({ success: false, message: assignmentError.message });
        }

        if (!assignments || assignments.length !== clientIds.length) {
            return res.status(404).json({
                success: false,
                message: 'One or more clients not found or not assigned to this coach'
            });
        }

        // Restore clients by updating coach_client_assignments
        const { error: updateError } = await supabase
            .from('coach_client_assignments')
            .update({
                is_active: true,
                is_archived: false,
            })
            .eq('coach_id', coachId)
            .in('client_id', clientIds);

        if (updateError) {
            return res.status(500).json({ success: false, message: updateError.message });
        }

        success(res, {
            message: `Successfully restored ${clientIds.length} client(s)`,
            data: { clientIds },
        });
    },
    /**
     * Resend invitation email to client
     */
    resendInvite: async (req: Request, res: Response) => {
        const coachId = getActingCoachId(req);
        const { clientId } = req.body;

        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!clientId) {
            return res.status(400).json({ success: false, message: 'clientId is required' });
        }

        const supabase = getSupabaseClient();

        // Fetch client details to get email and invitation token
        const { data: client, error } = await supabase
            .from('coach_clients_view')
            .select('email, invitation_token, full_name')
            .eq('coach_id', coachId)
            .eq('client_id', clientId)
            .single();

        if (error || !client) {
            console.error('Error fetching client for resend invite:', error, { coachId, clientId });
            return notFound(res, { message: 'Client not found' });
        }

        // TODO: Send invitation email to client.email with client.invitation_token
        // Email should include:
        // - Client name (client.full_name)
        // - Invitation link with token
        // - Coach information
        console.log(`TODO: Send invitation email to ${client.email} with token ${client.invitation_token}`);

        success(res, {
            message: 'Invitation resent successfully',
            data: { email: client.email }
        });
    },
};
