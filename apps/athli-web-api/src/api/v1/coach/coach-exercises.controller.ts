import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { success, unauthorized, created, forbidden, internalError, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachExercisesController = {
    /**
     * Get all exercises for a coach
     */
    getExercises: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: exercises, error } = await supabase
            .from('coach_exercises')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach exercises retrieved successfully',
            data: { exercises },
        });
    },

    /**
     * Create a new coach exercise
     */
    createExercise: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name, description, category, muscle_group, difficulty, video_link } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Exercise name is required' });
        }

        const supabase = getSupabaseClient();
        const { data: exercise, error } = await supabase
            .from('coach_exercises')
            .insert({
                coach_id: userId,
                name,
                description,
                category,
                muscle_group,
                difficulty,
                video_link,
            })
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        created(res, {
            message: 'Coach exercise created successfully',
            data: { exercise },
        });
    },

    /**
     * Update an existing coach exercise
     */
    updateExercise: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure ownership before updating
        const { data: existing, error: fetchError } = await supabase
            .from('coach_exercises')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return notFound(res, { message: 'Exercise not found' });
        }

        if (existing.coach_id !== userId) {
            return forbidden(res, { message: 'Forbidden' });
        }

        const { data: exercise, error } = await supabase
            .from('coach_exercises')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach exercise updated successfully',
            data: { exercise },
        });
    },

    /**
     * Delete a coach exercise
     */
    deleteExercise: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('coach_exercises')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return internalError(res, { message: error.message });
        }

        success(res, {
            message: 'Coach exercise deleted successfully',
        });
    },

    /**
     * Toggle favorite status
     */
    toggleFavorite: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { isFavourite } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (typeof isFavourite !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isFavourite boolean is required' });
        }

        const supabase = getSupabaseClient();

        const { data: exercise, error } = await supabase
            .from('coach_exercises')
            .update({
                is_favourite: isFavourite,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('coach_id', userId)
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        if (!exercise) {
            return notFound(res, { message: 'Exercise not found' });
        }

        success(res, {
            message: `Exercise ${isFavourite ? 'starred' : 'unstarred'} successfully`,
            data: { exercise },
        });
    },
    /**
     * Get exercise by ID
     */
    getExerciseById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: exercise, error } = await supabase
            .from('coach_exercises')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (error || !exercise) {
            return notFound(res, { message: 'Exercise not found' });
        }

        success(res, {
            message: 'Coach exercise retrieved successfully',
            data: { exercise },
        });
    },

    /**
     * Duplicate a coach exercise
     */
    duplicateExercise: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params || req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Get existing exercise
        const { data: existing, error: fetchError } = await supabase
            .from('coach_exercises')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !existing) {
            return notFound(res, { message: 'Exercise not found' });
        }

        // Create duplicate
        const { data: exercise, error } = await supabase
            .from('coach_exercises')
            .insert({
                coach_id: userId,
                name: `${existing.name} (Copy)`,
                description: existing.description,
                category: existing.category,
                muscle_group: existing.muscle_group,
                difficulty: existing.difficulty,
                video_link: existing.video_link,
            })
            .select()
            .single();

        if (error) {
            return internalError(res, { message: error.message });
        }

        created(res, {
            message: 'Coach exercise duplicated successfully',
            data: { exercise },
        });
    },

    /**
     * Get a fresh signed URL for an exercise video
     */
    getExerciseVideoUrl: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Get exercise to verify ownership and get video_link
        const { data: exercise, error: fetchError } = await supabase
            .from('coach_exercises')
            .select('video_link, coach_id')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !exercise) {
            return notFound(res, { message: 'Exercise not found' });
        }

        if (!exercise.video_link) {
            return success(res, {
                message: 'No video link for this exercise',
                data: { url: null },
            });
        }

        // Check if it's a Supabase URL that needs re-signing
        try {
            const urlObj = new URL(exercise.video_link);
            if (!urlObj.hostname.includes('supabase.co')) {
                // Not a Supabase URL, return as-is (YouTube, Vimeo, etc.)
                return success(res, {
                    message: 'Video URL retrieved successfully',
                    data: { url: exercise.video_link },
                });
            }

            // Extract file path from Supabase URL
            // URL format: /storage/v1/object/sign/{bucket}/{path}?token=...
            const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/([^?]+)/);
            if (!pathMatch) {
                // Couldn't parse, return original URL
                return success(res, {
                    message: 'Video URL retrieved successfully',
                    data: { url: exercise.video_link },
                });
            }

            const fullPath = pathMatch[1]; // e.g., "coach_files/uuid/file.mp4"
            const [bucket, ...pathParts] = fullPath.split('/');
            const filePath = pathParts.join('/');

            // Create fresh signed URL
            const { data: signedUrlData, error: signError } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (signError || !signedUrlData?.signedUrl) {
                // Fallback to original URL if signing fails
                return success(res, {
                    message: 'Video URL retrieved successfully',
                    data: { url: exercise.video_link },
                });
            }

            success(res, {
                message: 'Video URL retrieved successfully',
                data: { url: signedUrlData.signedUrl },
            });
        } catch {
            // On any error, return original URL
            success(res, {
                message: 'Video URL retrieved successfully',
                data: { url: exercise.video_link },
            });
        }
    },

    /**
     * Upload exercise video directly to storage (without coach_files table)
     */
    uploadExerciseVideo: async (req: Request, res: Response) => {
        const userId = (req as any).userId;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const file = (req as any).file;
        if (!file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const supabase = getSupabaseClient();
        const fileExtension = file.originalname?.split('.').pop() || 'mp4';
        const uniqueFilename = `${randomUUID()}.${fileExtension}`;
        const filePath = `${userId}/${uniqueFilename}`;

        // Upload to exercise_videos bucket (separate from coach_files)
        const { error: uploadError } = await supabase.storage
            .from('exercise_videos')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype || 'video/mp4',
                upsert: false,
            });

        if (uploadError) {
            return internalError(res, { message: `Upload failed: ${uploadError.message}` });
        }

        // Create signed URL
        const { data: signedUrlData, error: signError } = await supabase.storage
            .from('exercise_videos')
            .createSignedUrl(filePath, 3600 * 24 * 365); // 1 year expiry

        if (signError || !signedUrlData?.signedUrl) {
            return internalError(res, { message: 'Failed to create signed URL' });
        }

        success(res, {
            message: 'Video uploaded successfully',
            data: { url: signedUrlData.signedUrl },
        });
    },
};
