import { Request, Response } from 'express';
import { success, unauthorized, created, noContent } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientPhotosController = {
    /**
     * Get all progress photos for a client
     */
    getPhotos: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: photos, error } = await supabase
            .from('client_photo_logs')
            .select('*')
            .eq('client_id', targetClientId)
            .eq('coach_id', userId)
            .order('date', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Helper to extract relative path from full URL if needed
        const extractPath = (urlOrPath: string | null) => {
            if (!urlOrPath) return null;
            if (urlOrPath.startsWith('http')) {
                // Extracts everything after 'client_photos/'
                const parts = urlOrPath.split('client_photos/');
                return parts.length > 1 ? parts[1] : urlOrPath;
            }
            return urlOrPath;
        };

        // Generate signed URLs for all photo paths
        const photosWithSignedUrls = await Promise.all((photos || []).map(async (log) => {
            const getSigned = async (path: string | null) => {
                const relativePath = extractPath(path);
                if (!relativePath) return null;

                const { data, error: signedError } = await supabase.storage
                    .from('client_photos')
                    .createSignedUrl(relativePath, 60 * 60 * 24); // 24 hours
                return data?.signedUrl || null;
            };

            return {
                ...log,
                front_photo_url: await getSigned(log.front_photo_path),
                side_photo_url: await getSigned(log.side_photo_path),
                back_photo_url: await getSigned(log.back_photo_path),
            };
        }));

        success(res, {
            message: 'Client progress photos retrieved successfully',
            data: { photos: photosWithSignedUrls },
        });
    },

    /**
     * Upload progress photos
     */
    uploadPhoto: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { date } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const supabase = getSupabaseClient();

        // Helper to upload a single file
        const uploadFile = async (file: Express.Multer.File, category: string) => {
            const fileExtension = file.originalname.split('.').pop() || 'jpg';
            const dateStr = date || new Date().toISOString().split('T')[0];
            const uniqueFileName = `${targetClientId}/${dateStr}/${category}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

            const { error: uploadError } = await supabase.storage
                .from('client_photos')
                .upload(uniqueFileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false,
                });

            if (uploadError) {
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            return uniqueFileName;
        };

        try {
            const photoPaths: { front_photo_path?: string, side_photo_path?: string, back_photo_path?: string } = {};

            if (files) {
                if (files['front']?.[0]) photoPaths.front_photo_path = await uploadFile(files['front'][0], 'front');
                if (files['side']?.[0]) photoPaths.side_photo_path = await uploadFile(files['side'][0], 'side');
                if (files['back']?.[0]) photoPaths.back_photo_path = await uploadFile(files['back'][0], 'back');
            }

            if (Object.keys(photoPaths).length === 0) {
                return res.status(400).json({ success: false, message: 'At least one photo is required' });
            }

            // Insert a single log entry for all photos uploaded in this session
            // Use upsert to handle duplicate dates
            const { data, error } = await supabase
                .from('client_photo_logs')
                .upsert({
                    client_id: targetClientId,
                    coach_id: userId,
                    date: date || new Date().toISOString().split('T')[0],
                    ...photoPaths,
                }, {
                    onConflict: 'client_id,date'
                })
                .select()
                .single();

            if (error) {
                return res.status(500).json({ success: false, message: error.message });
            }

            created(res, {
                message: 'Progress photos uploaded successfully',
                data: { log: data },
            });

        } catch (err: any) {
            return res.status(500).json({ success: false, message: `Processing failed: ${err.message}` });
        }
    },

    /**
     * Delete a progress photo
     */
    deletePhoto: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('client_photo_logs')
            .delete()
            .eq('id', id)
            .eq('client_id', targetClientId)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },

    /**
     * Delete a specific photo angle (front, back, or side)
     */
    deletePhotoAngle: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { id, angle } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        // Validate angle parameter
        if (!['front', 'back', 'side'].includes(angle)) {
            return res.status(400).json({ success: false, message: 'Invalid angle. Must be front, back, or side.' });
        }

        const fieldName = `${angle}_photo_path` as 'front_photo_path' | 'back_photo_path' | 'side_photo_path';

        const supabase = getSupabaseClient();

        // First, get the current photo path so we can delete the storage file
        const { data: currentRow, error: fetchError } = await supabase
            .from('client_photo_logs')
            .select('front_photo_path, side_photo_path, back_photo_path')
            .eq('id', id)
            .eq('client_id', targetClientId)
            .eq('coach_id', userId)
            .single();

        if (fetchError) {
            return res.status(500).json({ success: false, message: fetchError.message });
        }

        // Delete the storage file if it exists
        const photoPath = currentRow?.[fieldName];
        if (photoPath) {
            // Extract relative path if it's a full URL
            const extractPath = (urlOrPath: string) => {
                if (urlOrPath.startsWith('http')) {
                    const parts = urlOrPath.split('client_photos/');
                    return parts.length > 1 ? parts[1] : urlOrPath;
                }
                return urlOrPath;
            };

            const relativePath = extractPath(photoPath);
            await supabase.storage
                .from('client_photos')
                .remove([relativePath]);
        }

        // Now update the database to set the path to null
        const { error } = await supabase
            .from('client_photo_logs')
            .update({ [fieldName]: null })
            .eq('id', id)
            .eq('client_id', targetClientId)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Check if all photo angles are now null, if so delete the entire row
        const { data: updatedRow, error: checkError } = await supabase
            .from('client_photo_logs')
            .select('front_photo_path, side_photo_path, back_photo_path')
            .eq('id', id)
            .eq('client_id', targetClientId)
            .eq('coach_id', userId)
            .single();

        if (!checkError && updatedRow) {
            const allPhotosNull = !updatedRow.front_photo_path &&
                !updatedRow.side_photo_path &&
                !updatedRow.back_photo_path;

            if (allPhotosNull) {
                // Delete the entire row since no photos remain
                await supabase
                    .from('client_photo_logs')
                    .delete()
                    .eq('id', id)
                    .eq('client_id', targetClientId)
                    .eq('coach_id', userId);
            }
        }

        noContent(res);
    },

    /**
     * Check if photos exist for a specific date
     */
    checkExistingPhotos: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { date } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!date) {
            return res.status(400).json({ success: false, message: 'date required in body' });
        }

        const supabase = getSupabaseClient();
        const { data: log, error } = await supabase
            .from('client_photo_logs')
            .select('id, front_photo_path, side_photo_path, back_photo_path, date')
            .eq('client_id', targetClientId)
            .eq('coach_id', userId)
            .eq('date', date)
            .maybeSingle();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        const existingAngles: string[] = [];
        if (log) {
            if (log.front_photo_path) existingAngles.push('front');
            if (log.side_photo_path) existingAngles.push('side');
            if (log.back_photo_path) existingAngles.push('back');
        }

        success(res, {
            message: 'Check completed',
            data: {
                exists: !!log,
                angles: existingAngles,
                date: log?.date
            }
        });
    },
};
