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
        // Photos might not track coach_id for visibility, typically they are just client's photos.
        // But if needed, we could filter. For now, just allow reading client's photos.

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: photos, error } = await supabase
            .from('client_photo_logs')
            .select('*')
            .eq('client_id', targetClientId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client progress photos retrieved successfully',
            data: { photos },
        });
    },

    /**
     * Upload a progress photo
     */
    uploadPhoto: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { category } = req.body;
        // Support both JSON body photo_url and Multipart file
        let photo_url = req.body.photo_url;
        const file = (req as any).file;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Handle file upload if provided
        if (file) {
            try {
                // Determine bucket - assuming 'client_photo_logs' 
                // Using random filename strategy from coach-files
                const fileExtension = file.originalname.split('.').pop() || 'jpg';
                const uniqueFileName = `${targetClientId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('client_photo_logs')
                    .upload(uniqueFileName, file.buffer, {
                        contentType: file.mimetype,
                        upsert: false,
                    });

                if (uploadError) {
                    // Try fallback bucket 'client_photos' or 'public_files' if needed? 
                    // Or just return error. Returning error is better.
                    return res.status(500).json({ success: false, message: `Upload failed: ${uploadError.message}` });
                }

                // Construct public URL or keys
                // If the bucket is private, we store the path and generate signed URLs on get...
                // But getPhotos currently returns `photo_url`.
                // If existing data has full URLs, then maybe public?
                // Or maybe we store the path and `getPhotos` should generate signed URLs.
                // Looking at getPhotos (Step 971): `select('*')`.
                // It returns whatever is in the column `photo_url`.
                // If we store the path here, the frontend might break if it expects a full URL.
                // Assuming we store the PATH for now and `getPhotos` or frontend handles it?
                // OR we generate a Signed URL immediately? But that expires.
                // OR it's a public bucket.
                // Let's assume we store the path in `photo_url` column same as `coach-files` stores in `file_path`.
                // Wait, `coach-files` has separate `file_path` column.
                // `client_photo_logs` has `photo_url`.
                // I will try to get the public URL.
                const { data: publicUrlData } = supabase.storage
                    .from('client_photo_logs')
                    .getPublicUrl(uniqueFileName);

                photo_url = publicUrlData.publicUrl;

            } catch (err: any) {
                return res.status(500).json({ success: false, message: `Processing failed: ${err.message}` });
            }
        }

        if (!photo_url) {
            return res.status(400).json({ success: false, message: 'Photo URL or File is required' });
        }

        const { data, error } = await supabase
            .from('client_photo_logs')
            .insert({
                client_id: targetClientId,
                photo_url,
                category,
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Progress photo uploaded successfully',
            data: { photo: data },
        });
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
            .eq('client_id', targetClientId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        noContent(res);
    },
};
