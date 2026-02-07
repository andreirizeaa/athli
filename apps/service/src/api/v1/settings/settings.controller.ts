import { Request, Response } from 'express';
import { success, unauthorized } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const settingsController = {
    /**
     * Get coach notifications settings
     * Merges available events with coach-specific overrides
     */
    getNotifications: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Fetch available events and the coach's specific preferences in parallel
        const [eventsRes, prefsRes] = await Promise.all([
            supabase
                .from('available_notification_events')
                .select('*')
                .order('category', { ascending: true }),
            supabase
                .from('coach_notification_preferences')
                .select('*')
                .eq('coach_id', userId)
        ]);

        if (eventsRes.error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch notification settings' });
        }

        if (prefsRes.error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch notification settings' });
        }

        // Merge preferences with available events, fallback to default_enabled if no preference row exists
        const notifications = eventsRes.data.map(event => {
            const pref = prefsRes.data.find(p => p.event_id === event.id);
            return {
                event_id: event.id,
                event_key: event.event_key,
                name: event.name,
                description: event.description,
                category: event.category,
                enabled: pref ? pref.enabled : event.default_enabled
            };
        });

        success(res, {
            message: 'Coach notifications settings retrieved successfully',
            data: { notifications },
        });
    },

    /**
     * Update coach notifications settings
     * Upserts into coach_notification_preferences
     */
    updateNotifications: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { eventId, enabled } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!eventId || enabled === undefined) {
            return res.status(400).json({ success: false, message: 'eventId and enabled are required' });
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_notification_preferences')
            .upsert({
                coach_id: userId,
                event_id: eventId,
                enabled,
            }, {
                onConflict: 'coach_id,event_id'
            });

        if (error) {
            return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        }

        success(res, {
            message: 'Coach notifications settings updated successfully',
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
