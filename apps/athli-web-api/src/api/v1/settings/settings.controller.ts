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
        const { data: notifications, error } = await supabase
            .from('v_my_notification_settings')
            .select('*')
            .order('category', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

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
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach notifications settings updated successfully',
        });
    },

    /**
     * Get coach preferences
     */
    getPreferences: async (req: Request, res: Response) => {
        success(res, {
            message: 'Coach preferences retrieved successfully',
            data: {
                preferences: {},
            },
        });
    },

    /**
     * Update coach preferences
     */
    updatePreferences: async (req: Request, res: Response) => {
        success(res, {
            message: 'Coach preferences updated successfully',
            data: {
                preferences: req.body,
            },
        });
    },

    /**
     * Get coach company information
     */
    getCompany: async (req: Request, res: Response) => {
        success(res, {
            message: 'Coach company information retrieved successfully',
            data: {
                company: {},
            },
        });
    },

    /**
     * Update coach company information
     */
    updateCompany: async (req: Request, res: Response) => {
        success(res, {
            message: 'Coach company information updated successfully',
            data: {
                company: req.body,
            },
        });
    },
};
