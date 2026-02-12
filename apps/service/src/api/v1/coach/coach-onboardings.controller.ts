import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

function generateCode(length: number = 12): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
}

export const coachOnboardingController = {
    /**
     * Get all onboardings for a coach
     */
    getOnboardings: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: onboardings, error } = await supabase
            .from('coach_onboardings')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach onboardings retrieved successfully',
            data: { onboardings },
        });
    },

    /**
     * Get a single onboarding by ID
     */
    getOnboardingById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: onboarding, error } = await supabase
            .from('coach_onboardings')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return notFound(res, { message: 'Onboarding not found' });
            }
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach onboarding retrieved successfully',
            data: { onboarding },
        });
    },

    /**
     * Create a new onboarding
     */
    createOnboarding: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name, description, flow_data } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('coach_onboardings')
            .insert([
                {
                    coach_id: userId,
                    name,
                    description,
                    flow_data,
                },
            ])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Auto-create an invite code for this onboarding with retry on collision
        const maxRetries = 5;
        let codeCreated = false;
        for (let attempt = 0; attempt < maxRetries && !codeCreated; attempt++) {
            const { error: codeError } = await supabase
                .from('coach_unique_codes')
                .insert({
                    coach_id: userId,
                    code: generateCode(12),
                    onboarding_id: data.id,
                });

            if (!codeError) {
                codeCreated = true;
            } else if (codeError.code !== '23505') {
                // Not a duplicate key error, log and stop retrying
                console.error('Failed to create invite code for onboarding:', codeError);
                break;
            }
            // On duplicate key (23505), retry with new code
        }

        if (!codeCreated) {
            console.error('Failed to create unique invite code after multiple attempts');
        }

        created(res, {
            message: 'Coach onboarding created successfully',
            data: { onboarding: data },
        });
    },

    /**
     * Update an onboarding
     */
    updateOnboarding: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('coach_onboardings')
            .update(updates)
            .eq('id', id)
            .eq('coach_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        if (!data) {
            return notFound(res, { message: 'Onboarding not found' });
        }

        success(res, {
            message: 'Coach onboarding updated successfully',
            data: { onboarding: data },
        });
    },

    /**
     * Delete an onboarding
     */
    deleteOnboarding: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('coach_onboardings')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },
};
