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
            .eq('coach_id', coachId);

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
        const { id } = req.params;

        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (!isUuid) {
            return res.status(400).json({ success: false, message: 'Invalid ID format' });
        }

        const query = supabase
            .from('coach_clients_view')
            .select('*')
            .eq('coach_id', coachId)
            .eq('client_id', id);

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
        const coachId = getActingCoachId(req);
        const { id } = req.params;
        const updates = req.body;

        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // 1. Separate assignment updates from profile updates
        const assignmentFields = ['category', 'status', 'is_archived'];
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
                .eq('coach_id', coachId);

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
            .eq('coach_id', coachId)
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
        const coachId = getActingCoachId(req);
        const { id } = req.params;

        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_client_assignments')
            .delete()
            .eq('client_id', id)
            .eq('coach_id', coachId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
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
        const clientIdHeader = req.header('x-client-id');

        if (!clientIdHeader) {
            return res.status(400).json({ success: false, message: 'x-client-id header is required' });
        }

        const id = clientIdHeader; // client_id

        if (!coachId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Verify the client belongs to this coach
        const { data: assignment, error: assignmentError } = await supabase
            .from('coach_client_assignments')
            .select('*')
            .eq('coach_id', coachId)
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

        success(res, { message: 'Client restored successfully' });
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
