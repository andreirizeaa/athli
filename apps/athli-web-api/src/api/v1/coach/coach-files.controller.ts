import { Request, Response } from 'express';
import { success, unauthorized, created } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { randomUUID } from 'crypto';

export const coachFilesController = {
    /**
     * Get all files for a coach
     */
    getFiles: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: files, error } = await supabase
            .from('coach_files')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach files retrieved successfully',
            data: { files },
        });
    },

    /**
     * Upload a new file
     */
    uploadFile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const file = (req as any).file;
        if (!file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const { filename, tags } = req.body;
        if (!filename) {
            return res.status(400).json({ success: false, message: 'Filename is required' });
        }

        try {
            const supabase = getSupabaseClient();

            // Generate unique file path
            const fileExtension = file.originalname.split('.').pop();
            const uniqueFileName = `${randomUUID()}.${fileExtension}`;
            const filePath = `${userId}/${uniqueFileName}`;

            // Upload file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('coach_files')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false,
                });

            if (uploadError) {
                return res.status(500).json({ success: false, message: uploadError.message });
            }

            // Store file metadata in database
            const { data: fileRecord, error: dbError } = await supabase
                .from('coach_files')
                .insert({
                    coach_id: userId,
                    bucket_id: 'coach_files',
                    file_path: filePath,
                    filename: filename,
                    mime_type: file.mimetype,
                    size: file.size,
                })
                .select()
                .single();

            if (dbError) {
                // Cleanup: delete uploaded file if database insert fails
                await supabase.storage.from('coach_files').remove([filePath]);
                return res.status(500).json({ success: false, message: dbError.message });
            }

            created(res, {
                message: 'File uploaded successfully',
                data: { file: fileRecord },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Update file metadata (filename, tags)
     */
    updateFile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { filename } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!filename) {
            return res.status(400).json({ success: false, message: 'Filename is required' });
        }

        const supabase = getSupabaseClient();

        // Check ownership
        const { data: existingFile, error: fetchError } = await supabase
            .from('coach_files')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !existingFile) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Update file metadata
        const { data: updatedFile, error: updateError } = await supabase
            .from('coach_files')
            .update({ filename })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ success: false, message: updateError.message });
        }

        success(res, {
            message: 'File updated successfully',
            data: { file: updatedFile },
        });
    },

    /**
     * Delete a file (from both storage and database)
     */
    deleteFile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Get file info for deletion
        const { data: fileToDelete, error: fetchError } = await supabase
            .from('coach_files')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !fileToDelete) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('coach_files')
            .remove([fileToDelete.file_path]);

        if (storageError) {
            console.error('Storage deletion error:', storageError);
            // Continue with database deletion even if storage deletion fails
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from('coach_files')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return res.status(500).json({ success: false, message: deleteError.message });
        }

        success(res, {
            message: 'File deleted successfully',
            data: null,
        });
    },

    /**
     * Get signed URL for file access
     */
    getFileUrl: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Verify ownership
        const { data: file, error: fetchError } = await supabase
            .from('coach_files')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Generate signed URL (valid for 1 hour)
        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('coach_files')
            .createSignedUrl(file.file_path, 3600);

        if (urlError || !signedUrlData) {
            return res.status(500).json({ success: false, message: 'Failed to generate file URL' });
        }

        success(res, {
            message: 'File URL generated successfully',
            data: { url: signedUrlData.signedUrl, file },
        });
    },
};
