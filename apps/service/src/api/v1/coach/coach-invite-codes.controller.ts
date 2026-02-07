import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { success, badRequest } from '../../../utils/http-response';
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

export const coachInviteCodesController = {
    /**
     * Get or create an invite code for a coach + optional onboarding combo.
     * POST /api/v1/coach/invite-codes
     * Body: { onboardingId?: string }
     */
    getOrCreateInviteCode: async (req: Request, res: Response) => {
        const coachId = (req as any).userId;
        const { onboardingId } = req.body;

        const supabase = getSupabaseClient();

        // Build query for existing code
        let query = supabase
            .from('coach_unique_codes')
            .select('code')
            .eq('coach_id', coachId);

        if (onboardingId) {
            query = query.eq('onboarding_id', onboardingId);
        } else {
            query = query.is('onboarding_id', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            return success(res, { data: { code: existing.code } });
        }

        const newCode = generateCode(12);

        const { error: insertError } = await supabase
            .from('coach_unique_codes')
            .insert({
                coach_id: coachId,
                code: newCode,
                onboarding_id: onboardingId || null,
            });

        if (insertError) {
            // Race condition: code might have been created by another request
            if (insertError.code === '23505') {
                const { data: retryData } = await query.maybeSingle();
                if (retryData) {
                    return success(res, { data: { code: retryData.code } });
                }
            }
            return badRequest(res, { message: 'Failed to create invite code' });
        }

        success(res, { data: { code: newCode } });
    },

    /**
     * Get all invite codes for a coach.
     * GET /api/v1/coach/invite-codes
     */
    getInviteCodes: async (req: Request, res: Response) => {
        const coachId = (req as any).userId;
        const supabase = getSupabaseClient();

        const { data: codes, error } = await supabase
            .from('coach_unique_codes')
            .select('code, onboarding_id, created_at')
            .eq('coach_id', coachId)
            .order('created_at', { ascending: true });

        if (error) {
            return badRequest(res, { message: 'Failed to fetch invite codes' });
        }

        success(res, { data: { codes } });
    },
};
