import { Request, Response } from 'express';
import { success, unauthorized } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const settingsController = {
    /**
     * Get coach notification preferences
     * Returns preferences for all notification types with in_app and push toggles
     */
    getNotifications: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('coach_notification_preferences')
            .select('*')
            .eq('coach_id', userId);

        if (error) {
            console.error('[getNotifications] Supabase error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch notification settings' });
        }

        success(res, {
            message: 'Coach notifications settings retrieved successfully',
            data: { preferences: data || [] },
        });
    },

    /**
     * Update notification preferences
     * Accepts either a single preference or an array:
     *   Single: { notificationType, inAppEnabled?, pushEnabled? }
     *   Batch:  { preferences: [{ notificationType, inAppEnabled?, pushEnabled? }, ...] }
     */
    updateNotifications: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { preferences, notificationType, inAppEnabled, pushEnabled } = req.body;
        const now = new Date().toISOString();

        // Build array of upsert rows
        let rows: Record<string, any>[];
        if (Array.isArray(preferences)) {
            rows = preferences.map((p: any) => {
                const row: Record<string, any> = {
                    coach_id: userId,
                    notification_type: p.notificationType,
                    updated_at: now,
                };
                if (p.inAppEnabled !== undefined) row.in_app_enabled = p.inAppEnabled;
                if (p.pushEnabled !== undefined) row.push_enabled = p.pushEnabled;
                return row;
            });
        } else if (notificationType) {
            const row: Record<string, any> = {
                coach_id: userId,
                notification_type: notificationType,
                updated_at: now,
            };
            if (inAppEnabled !== undefined) row.in_app_enabled = inAppEnabled;
            if (pushEnabled !== undefined) row.push_enabled = pushEnabled;
            rows = [row];
        } else {
            return res.status(400).json({ success: false, message: 'notificationType or preferences array is required' });
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_notification_preferences')
            .upsert(rows, {
                onConflict: 'coach_id,notification_type'
            });

        if (error) {
            console.error('[updateNotifications] Supabase error:', error);
            return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        }

        success(res, {
            message: 'Coach notifications settings updated successfully',
        });
    },

    /**
     * Bulk update notification preferences
     * Sets all notification types to the same in_app_enabled and/or push_enabled value
     */
    bulkUpdateNotifications: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { inAppEnabled, pushEnabled } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (inAppEnabled === undefined && pushEnabled === undefined) {
            return res.status(400).json({ success: false, message: 'At least one of inAppEnabled or pushEnabled is required' });
        }

        const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };
        if (inAppEnabled !== undefined) updates.in_app_enabled = inAppEnabled;
        if (pushEnabled !== undefined) updates.push_enabled = pushEnabled;

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_notification_preferences')
            .update(updates)
            .eq('coach_id', userId);

        if (error) {
            console.error('[bulkUpdateNotifications] Supabase error:', error);
            return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        }

        success(res, {
            message: 'All notification preferences updated successfully',
        });
    },

    /**
     * Get coach preferences
     */
    getPreferences: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: preferences, error } = await supabase
            .from('coach_preferences')
            .select('*')
            .eq('coach_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is no rows
            return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        }

        success(res, {
            message: 'Coach preferences retrieved successfully',
            data: {
                preferences: preferences || {}, // Return empty object if no preferences set yet
            },
        });
    },

    /**
     * Update coach preferences
     */
    updatePreferences: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Remove undefined fields
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        const { data: preferences, error } = await supabase
            .from('coach_preferences')
            .upsert({
                coach_id: userId,
                ...cleanUpdates,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'coach_id'
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        }

        success(res, {
            message: 'Coach preferences updated successfully',
            data: {
                preferences,
            },
        });
    },

    /**
     * Get coach company information
     */
    getCompany: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: company, error } = await supabase
            .from('coach_company_information')
            .select('*')
            .eq('coach_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        }

        success(res, {
            message: 'Coach company information retrieved successfully',
            data: {
                company: company || {},
            },
        });
    },

    /**
     * Update coach company information
     */
    updateCompany: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Remove undefined fields
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        const { data: company, error } = await supabase
            .from('coach_company_information')
            .upsert({
                coach_id: userId,
                ...cleanUpdates,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'coach_id'
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        }

        success(res, {
            message: 'Coach company information updated successfully',
            data: {
                company,
            },
        });
    },
    /**
     * Register/update a push token for the coach
     */
    registerPushToken: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { expoPushToken, deviceId } = req.body;

        if (!expoPushToken) {
            return res.status(400).json({ success: false, message: 'expoPushToken is required' });
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_push_tokens')
            .upsert({
                coach_id: userId,
                expo_push_token: expoPushToken,
                device_id: deviceId || null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'coach_id,expo_push_token'
            });

        if (error) {
            console.error('[registerPushToken] Supabase error:', error);
            return res.status(500).json({ success: false, message: 'Failed to register push token' });
        }

        success(res, {
            message: 'Push token registered successfully',
        });
    },

    /**
     * Delete a push token (e.g., on logout)
     */
    deletePushToken: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { expoPushToken } = req.body;

        if (!expoPushToken) {
            return res.status(400).json({ success: false, message: 'expoPushToken is required' });
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_push_tokens')
            .delete()
            .eq('coach_id', userId)
            .eq('expo_push_token', expoPushToken);

        if (error) {
            console.error('[deletePushToken] Supabase error:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete push token' });
        }

        success(res, {
            message: 'Push token deleted successfully',
        });
    },

    /**
     * Register/update a push token for a client
     */
    registerClientPushToken: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { expoPushToken, deviceId } = req.body;

        if (!expoPushToken) {
            return res.status(400).json({ success: false, message: 'expoPushToken is required' });
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('client_push_tokens')
            .upsert({
                client_id: userId,
                expo_push_token: expoPushToken,
                device_id: deviceId || null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'client_id,expo_push_token'
            });

        if (error) {
            console.error('[registerClientPushToken] Supabase error:', error);
            return res.status(500).json({ success: false, message: 'Failed to register push token' });
        }

        success(res, {
            message: 'Client push token registered successfully',
        });
    },

    /**
     * Delete a client push token (e.g., on logout)
     */
    deleteClientPushToken: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { expoPushToken } = req.body;

        if (!expoPushToken) {
            return res.status(400).json({ success: false, message: 'expoPushToken is required' });
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('client_push_tokens')
            .delete()
            .eq('client_id', userId)
            .eq('expo_push_token', expoPushToken);

        if (error) {
            console.error('[deleteClientPushToken] Supabase error:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete push token' });
        }

        success(res, {
            message: 'Client push token deleted successfully',
        });
    },

    /**
     * Get coach unique code
     */
    getUniqueCode: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: codeData, error } = await supabase
            .from('coach_unique_codes')
            .select('code')
            .eq('coach_id', userId)
            .is('onboarding_id', null)
            .single();

        if (error && error.code !== 'PGRST116') {
            return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        }

        success(res, {
            message: 'Coach unique code retrieved successfully',
            data: {
                code: codeData?.code || null,
            },
        });
    },
};
