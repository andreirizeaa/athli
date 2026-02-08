import { Request, Response } from 'express';
import { success, unauthorized, internalError, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const notificationsController = {
    getNotifications: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const unreadOnly = req.query.unread === 'true';
        const supabase = getSupabaseClient();

        try {
            // Fetch notification types where in-app is disabled
            const { data: disabledPrefs } = await supabase
                .from('coach_notification_preferences')
                .select('notification_type')
                .eq('coach_id', userId)
                .eq('in_app_enabled', false);

            const disabledTypes = (disabledPrefs || []).map((p: any) => p.notification_type);

            let query = supabase
                .from('coach_notifications')
                .select('*')
                .eq('coach_id', userId)
                .order('created_at', { ascending: false });

            if (disabledTypes.length > 0) {
                query = query.not('notification_type', 'in', `(${disabledTypes.join(',')})`);
            }

            if (unreadOnly) {
                query = query.is('read_at', null);
            }

            const { data: notifications, error } = await query;

            if (error) {
                return internalError(res, { message: 'Failed to fetch notifications' });
            }

            // Get unique client IDs to fetch their profiles
            const clientIds = [...new Set((notifications || []).map((n: any) => n.client_id))];

            let profileMap = new Map<string, { name: string; profile_picture_url: string | null }>();
            if (clientIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('user_profiles')
                    .select('id, name, profile_picture_url')
                    .in('id', clientIds);

                (profiles || []).forEach((p: any) => {
                    profileMap.set(p.id, { name: p.name, profile_picture_url: p.profile_picture_url });
                });
            }

            const mapped = (notifications || []).map((n: any) => {
                const profile = profileMap.get(n.client_id);
                return {
                    id: n.id,
                    client_id: n.client_id,
                    client_name: profile?.name || 'Unknown',
                    client_avatar_url: profile?.profile_picture_url || null,
                    notification_type: n.notification_type,
                    title: n.title,
                    description: n.description,
                    metadata: n.metadata,
                    read_at: n.read_at,
                    created_at: n.created_at,
                };
            });

            success(res, {
                message: 'Notifications retrieved successfully',
                data: { notifications: mapped },
            });
        } catch (error: any) {
            return internalError(res, { message: 'An unexpected error occurred' });
        }
    },

    markAsRead: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        try {
            const { data, error } = await supabase
                .from('coach_notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', id)
                .eq('coach_id', userId)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return notFound(res, { message: 'Notification not found' });
                }
                return internalError(res, { message: 'Failed to mark notification as read' });
            }

            success(res, { message: 'Notification marked as read', data: { notification: data } });
        } catch (error: any) {
            return internalError(res, { message: 'An unexpected error occurred' });
        }
    },

    markAsUnread: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        try {
            const { data, error } = await supabase
                .from('coach_notifications')
                .update({ read_at: null })
                .eq('id', id)
                .eq('coach_id', userId)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return notFound(res, { message: 'Notification not found' });
                }
                return internalError(res, { message: 'Failed to mark notification as unread' });
            }

            success(res, { message: 'Notification marked as unread', data: { notification: data } });
        } catch (error: any) {
            return internalError(res, { message: 'An unexpected error occurred' });
        }
    },

    markAllAsRead: async (req: Request, res: Response) => {
        const userId = (req as any).userId;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        try {
            const { error } = await supabase
                .from('coach_notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('coach_id', userId)
                .is('read_at', null);

            if (error) {
                return internalError(res, { message: 'Failed to mark all notifications as read' });
            }

            success(res, { message: 'All notifications marked as read' });
        } catch (error: any) {
            return internalError(res, { message: 'An unexpected error occurred' });
        }
    },
};
