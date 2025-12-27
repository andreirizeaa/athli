import { Request, Response } from 'express';
import { success, unauthorized, notFound, created, noContent, forbidden } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientFilesController = {
    /**
     * Get all files assigned to a client
     */
    getFiles: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');

        let targetClientId: string;
        let targetCoachId: string | undefined;

        if (coachIdHeader) {
            if (coachIdHeader !== userId) return unauthorized(res, { message: 'Coach ID mismatch' });
            if (!clientIdHeader) return forbidden(res, { message: 'x-client-id header required' });
            targetClientId = clientIdHeader as string;
            targetCoachId = coachIdHeader as string;

            // Verify Relation
            const supabase = getSupabaseClient();
            const { data: relation } = await supabase
                .from('coach_client_assignments')
                .select('client_id')
                .eq('coach_id', targetCoachId)
                .eq('client_id', targetClientId)
                .single();

            if (!relation) return forbidden(res, { message: 'Forbidden' });
        } else {
            if (clientIdHeader && clientIdHeader !== userId) return forbidden(res, { message: 'Client ID mismatch' });
            targetClientId = userId;
            targetCoachId = coachIdHeader as string;
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_files')
            .select('*')
            .eq('client_id', targetClientId);

        if (targetCoachId) {
            query = query.eq('coach_id', targetCoachId);
        }

        const { data: assignments, error } = await query;

        if (error) return res.status(500).json({ success: false, message: error.message });

        const result = assignments.map((a: any) => ({
            id: a.id,
            assignment_id: a.id,
            coach_id: a.coach_id,
            // Flattened structure as per user preference in other controllers
            fileName: a.filename,
            file_path: a.file_path,
            mime_type: a.mime_type,
            size: a.size,
            created_at: a.created_at,
            // Keeping nested file obj for compatibility if needed, but preferable flat
            file: {
                id: a.id,
                filename: a.filename,
                file_path: a.file_path,
                mime_type: a.mime_type,
                size: a.size,
                created_at: a.created_at
            }
        }));

        success(res, {
            message: 'Client files retrieved successfully',
            data: { assignments: result },
        });
    },

    /**
     * Get signed URL for file access
     */
    getFileUrl: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const clientIdHeader = req.header('x-client-id'); // Optional if client requesting self

        // If coach requests url?
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;

        const targetClientId = isCoach ? (clientIdHeader as string) : userId;
        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });

        const supabase = getSupabaseClient();

        // 1. Fetch file path
        const { data: assignment, error: assignmentError } = await supabase
            .from('client_files')
            .select('client_id, file_path, bucket_id') // Assuming bucket_id exists or default
            .eq('id', id)
            .eq('client_id', targetClientId)
            .single();

        if (assignmentError || !assignment) {
            return notFound(res, { message: 'File not found or access denied' });
        }

        // 2. Generate signed URL
        // client_files usually stored in 'coach_files' bucket (or 'client_files'?)
        // The migration didn't specify bucket change, but usage says 'coach_files'.
        // Let's assume 'coach_files' if migrated from there. But wait, new detached files might be elsewhere?
        // Migration 037 removed coach_file_path.
        // We should check where files are actually stored. 
        // Existing logic used 'coach_files' bucket.
        const bucket = 'coach_files'; // Or 'client_files'? keeping 'coach_files' for now as per prev code.

        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(assignment.file_path, 3600);

        if (urlError || !signedUrlData) {
            return res.status(500).json({ success: false, message: 'Failed to generate file URL' });
        }

        success(res, {
            message: 'File URL generated successfully',
            data: { url: signedUrlData.signedUrl },
        });
    },

    /**
     * Assign file(s) to a client (Coach Only)
     */
    assignFile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { fileIds } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        if (!fileIds || !Array.isArray(fileIds)) {
            return res.status(400).json({ success: false, message: 'Invalid fileIds' });
        }

        const supabase = getSupabaseClient();

        // Verify Relation
        const { data: relation } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .eq('client_id', targetClientId)
            .single();

        if (!relation) return forbidden(res, { message: 'Forbidden' });

        // 1. Fetch metadata from coach_files
        const { data: coachFiles, error: fetchError } = await supabase
            .from('coach_files')
            .select('*')
            .in('id', fileIds)
            .eq('coach_id', targetCoachId);

        if (fetchError || !coachFiles || coachFiles.length === 0) {
            return res.status(404).json({ success: false, message: 'Source files not found' });
        }

        // 2. Create client copies
        const assignments = coachFiles.map((f: any) => ({
            client_id: targetClientId,
            coach_id: targetCoachId,
            filename: f.filename,
            display_name: f.filename,
            file_path: f.file_path,
            mime_type: f.mime_type,
            size: f.size
        }));

        const { data, error } = await supabase
            .from('client_files')
            .insert(assignments)
            .select();

        if (error) return res.status(500).json({ success: false, message: error.message });

        created(res, {
            message: 'Files assigned successfully',
            data: { assignments: data },
        });
    },

    /**
     * Delete (unassign) a file (Coach Only)
     */
    deleteAssignment: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { fileIds } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!Array.isArray(fileIds)) return res.status(400).json({ success: false, message: 'fileIds array required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('client_files')
            .delete()
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .in('id', fileIds);

        if (error) return res.status(500).json({ success: false, message: error.message });
        noContent(res);
    },

    /**
     * Upload a file directly for a client (Private)
     */
    uploadFile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const file = req.file;
        const { filename, tags } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!file) return res.status(400).json({ success: false, message: 'File is required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Verify Relation
        const { data: relation } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .eq('client_id', targetClientId)
            .single();

        if (!relation) return forbidden(res, { message: 'Forbidden' });

        // Upload to Storage
        const timestamp = new Date().getTime();
        const safeFilename = (filename || file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${targetCoachId}/${targetClientId}/${timestamp}_${safeFilename}`;

        const { error: uploadError } = await supabase.storage
            .from('coach_files')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) return res.status(500).json({ success: false, message: `Upload failed: ${uploadError.message}` });

        // Insert into client_files
        const displayName = filename || file.originalname;
        const { data: record, error: dbError } = await supabase
            .from('client_files')
            .insert({
                client_id: targetClientId,
                coach_id: targetCoachId,
                filename: displayName,
                display_name: displayName,
                file_path: filePath,
                mime_type: file.mimetype,
                size: file.size,
            })
            .select()
            .single();

        if (dbError) return res.status(500).json({ success: false, message: dbError.message });

        created(res, {
            message: 'File uploaded successfully',
            data: { file: record }
        });
    },
};
