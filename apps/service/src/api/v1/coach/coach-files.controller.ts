import { Request, Response } from 'express';
import { success, unauthorized, created } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { randomUUID } from 'crypto';
import { isExternalLink } from '../../../utils/file-utils';

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
                    size: file.size
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
     * Create a new link (external URL)
     */
    createLink: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { filename, url } = req.body;
        if (!filename) {
            return res.status(400).json({ success: false, message: 'Filename is required' });
        }
        if (!url) {
            return res.status(400).json({ success: false, message: 'URL is required' });
        }

        // Validate URL format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return res.status(400).json({ success: false, message: 'URL must start with http:// or https://' });
        }

        try {
            const supabase = getSupabaseClient();

            // Check if link with same URL already exists
            const { data: existingFile } = await supabase
                .from('coach_files')
                .select('id, filename')
                .eq('coach_id', userId)
                .eq('file_path', url)
                .single();

            if (existingFile) {
                // Return success with duplicate flag instead of error
                return success(res, {
                    message: 'Link already exists',
                    data: {
                        file: existingFile,
                        duplicate: true,
                        existingName: existingFile.filename
                    }
                });
            }

            // Store link in database with URL in file_path
            // Use 'coach_files' as bucket_id to satisfy check constraint (file_path being a URL distinguishes it)
            const { data: fileRecord, error: dbError } = await supabase
                .from('coach_files')
                .insert({
                    coach_id: userId,
                    bucket_id: 'coach_files',
                    file_path: url,
                    filename: filename,
                    mime_type: 'link',
                    size: null
                })
                .select()
                .single();

            if (dbError) {
                return res.status(500).json({ success: false, message: dbError.message });
            }

            created(res, {
                message: 'Link created successfully',
                data: { file: fileRecord, duplicate: false },
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

        // Only delete from storage if it's not an external link
        if (!isExternalLink(fileToDelete.file_path)) {
            const { error: storageError } = await supabase.storage
                .from('coach_files')
                .remove([fileToDelete.file_path]);

            if (storageError) {
                console.error('Storage deletion error:', storageError);
                // Continue with database deletion even if storage deletion fails
            }
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

        // If it's an external link, return the URL directly
        if (isExternalLink(file.file_path)) {
            success(res, {
                message: 'File URL retrieved successfully',
                data: { url: file.file_path, file },
            });
            return;
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

    // =============================================================================
    // Folder Operations
    // =============================================================================

    /**
     * Get all file folders for a coach
     */
    getFolders: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: folders, error } = await supabase
            .from('coach_file_folders')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'File folders retrieved successfully',
            data: { folders },
        });
    },

    /**
     * Create a new file folder
     */
    createFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Folder name is required' });
        }

        const supabase = getSupabaseClient();

        // Check for existing folders with same name and generate unique name
        let finalName = name;
        const { data: existingFolders } = await supabase
            .from('coach_file_folders')
            .select('name')
            .eq('coach_id', userId)
            .ilike('name', `${name}%`);

        if (existingFolders && existingFolders.length > 0) {
            const existingNames = new Set(existingFolders.map(f => f.name.toLowerCase()));
            if (existingNames.has(name.toLowerCase())) {
                let copyNum = 1;
                let newName = `${name} (Copy)`;
                while (existingNames.has(newName.toLowerCase())) {
                    copyNum++;
                    newName = `${name} (Copy ${copyNum})`;
                }
                finalName = newName;
            }
        }

        const { data: folder, error } = await supabase
            .from('coach_file_folders')
            .insert({
                coach_id: userId,
                name: finalName,
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'File folder created successfully',
            data: { folder },
        });
    },

    /**
     * Update a file folder
     */
    updateFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { name } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure ownership before updating
        const { data: existing } = await supabase
            .from('coach_file_folders')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Check for existing folders with same name (excluding current folder) and generate unique name
        let finalName = name;
        const { data: existingFolders } = await supabase
            .from('coach_file_folders')
            .select('name')
            .eq('coach_id', userId)
            .neq('id', id)
            .ilike('name', `${name}%`);

        if (existingFolders && existingFolders.length > 0) {
            const existingNames = new Set(existingFolders.map(f => f.name.toLowerCase()));
            if (existingNames.has(name.toLowerCase())) {
                let copyNum = 1;
                let newName = `${name} (Copy)`;
                while (existingNames.has(newName.toLowerCase())) {
                    copyNum++;
                    newName = `${name} (Copy ${copyNum})`;
                }
                finalName = newName;
            }
        }

        const { data: folder, error } = await supabase
            .from('coach_file_folders')
            .update({
                name: finalName,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'File folder updated successfully',
            data: { folder },
        });
    },

    /**
     * Delete a file folder (items inside become unfiled)
     */
    deleteFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // First, unfile all files in this folder
        await supabase
            .from('coach_files')
            .update({ folder_id: null })
            .eq('folder_id', id)
            .eq('coach_id', userId);

        // Then delete the folder
        const { error } = await supabase
            .from('coach_file_folders')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'File folder deleted successfully',
        });
    },

    /**
     * Move a file to a folder (or out of folder if folder_id is null)
     */
    moveFile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { folder_id } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure file ownership
        const { data: existing } = await supabase
            .from('coach_files')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // If folder_id is provided, verify ownership
        if (folder_id) {
            const { data: folder } = await supabase
                .from('coach_file_folders')
                .select('coach_id')
                .eq('id', folder_id)
                .single();

            if (!folder || folder.coach_id !== userId) {
                return res.status(403).json({ success: false, message: 'Folder not found' });
            }
        }

        const { data: file, error } = await supabase
            .from('coach_files')
            .update({
                folder_id: folder_id || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'File moved successfully',
            data: { file },
        });
    },

    /**
     * Get files in a specific folder
     */
    getFilesInFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: files, error } = await supabase
            .from('coach_files')
            .select('*')
            .eq('coach_id', userId)
            .eq('folder_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Files in folder retrieved successfully',
            data: { files },
        });
    },
};
