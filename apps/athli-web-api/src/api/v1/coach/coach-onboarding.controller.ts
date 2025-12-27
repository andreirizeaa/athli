import { Request, Response } from 'express';
import { success, unauthorized, created, noContent, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachOnboardingController = {
    /**
     * Get or create the single onboarding flow for a coach
     */
    getOnboarding: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Try to get existing flow
        let { data: onboarding, error } = await supabase
            .from('coach_onboarding')
            .select('*')
            .eq('coach_id', userId)
            .maybeSingle();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // If it doesn't exist, create it
        if (!onboarding) {
            const { data: newData, error: createError } = await supabase
                .from('coach_onboarding')
                .insert([
                    {
                        coach_id: userId,
                        flow_data: {
                            edges: [
                                {
                                    id: "trigger-to-add-trigger",
                                    type: "smoothstep",
                                    source: "trigger",
                                    target: "add-action-trigger"
                                },
                                {
                                    id: "add-trigger-to-end",
                                    type: "smoothstep",
                                    source: "add-action-trigger",
                                    target: "end"
                                }
                            ],
                            nodes: [
                                {
                                    id: "trigger",
                                    data: {
                                        icon: {},
                                        label: "Trigger",
                                        subtitle: "New client sign up",
                                        isOnboarding: true
                                    },
                                    type: "trigger",
                                    dagre: {
                                        x: 150,
                                        y: 32,
                                        rank: 0,
                                        width: 300,
                                        height: 64
                                    },
                                    width: 300,
                                    height: 56,
                                    position: {
                                        x: 0,
                                        y: 0
                                    }
                                },
                                {
                                    id: "add-action-trigger",
                                    data: {
                                        metadata: {
                                            index: 0
                                        }
                                    },
                                    type: "addAction",
                                    dagre: {
                                        x: 150,
                                        y: 114,
                                        rank: 2,
                                        width: 300,
                                        height: 40
                                    },
                                    width: 300,
                                    height: 40,
                                    position: {
                                        x: 0,
                                        y: 94
                                    }
                                },
                                {
                                    id: "end",
                                    data: {
                                        label: "End"
                                    },
                                    type: "end",
                                    dagre: {
                                        x: 150,
                                        y: 184,
                                        rank: 4,
                                        width: 300,
                                        height: 40
                                    },
                                    width: 300,
                                    height: 30,
                                    position: {
                                        x: 0,
                                        y: 164
                                    }
                                }
                            ]
                        },
                        is_active: false,
                    },
                ])
                .select()
                .single();

            if (createError) {
                return res.status(500).json({ success: false, message: createError.message });
            }
            onboarding = newData;
        }

        success(res, {
            message: 'Coach onboarding retrieved successfully',
            data: { onboarding },
        });
    },

    /**
     * Update the single onboarding flow
     */
    updateOnboarding: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('coach_onboarding')
            .update(updates)
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
     * Toggle publish state of the single onboarding flow
     */
    togglePublish: async (req: Request, res: Response) => {
        const userId = (req as any).userId;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // First, get current state
        const { data: existing, error: fetchError } = await supabase
            .from('coach_onboarding')
            .select('id, is_active')
            .eq('coach_id', userId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return notFound(res, { message: 'Onboarding not found' });
            }
            return res.status(500).json({ success: false, message: fetchError.message });
        }

        // Toggle the state
        const { data, error } = await supabase
            .from('coach_onboarding')
            .update({ is_active: !existing.is_active })
            .eq('coach_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: data.is_active
                ? 'Onboarding published successfully'
                : 'Onboarding unpublished successfully',
            data: { onboarding: data },
        });
    },
};
