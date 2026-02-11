import { Request, Response } from 'express';
import { success, unauthorized, notFound, created, noContent, forbidden } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { isExternalLink } from '../../../utils/file-utils';

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

        // Determine request context by matching userId to headers
        const isCoachRequest = coachIdHeader && coachIdHeader === userId;

        if (isCoachRequest) {
            // COACH SCENARIO: Coach accessing client's data
            if (!clientIdHeader) {
                return forbidden(res, { message: 'x-client-id header required for coach requests' });
            }

            targetClientId = clientIdHeader;
            targetCoachId = coachIdHeader;

            // Verify coach-client relationship
            const supabase = getSupabaseClient();
            const { data: relation } = await supabase
                .from('coach_client_assignments')
                .select('client_id')
                .eq('coach_id', targetCoachId)
                .eq('client_id', targetClientId)
                .single();

            if (!relation) {
                return forbidden(res, { message: 'Client not assigned to this coach' });
            }
        } else {
            // CLIENT SCENARIO: Client accessing their own data
            // If x-client-id provided, it must match authenticated user
            if (clientIdHeader && clientIdHeader !== userId) {
                return forbidden(res, { message: 'Cannot access another client\'s data' });
            }

            targetClientId = clientIdHeader || userId;

            // x-coach-id scopes to a specific coach relationship (optional)
            if (coachIdHeader) {
                // Verify client is assigned to this coach
                const supabase = getSupabaseClient();
                const { data: assignment } = await supabase
                    .from('coach_client_assignments')
                    .select('coach_id')
                    .eq('client_id', targetClientId)
                    .eq('coach_id', coachIdHeader)
                    .single();

                if (!assignment) {
                    return forbidden(res, { message: 'Not assigned to this coach' });
                }

                targetCoachId = coachIdHeader;
            }
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

        // 1. Fetch file path and coach_id
        const { data: assignment, error: assignmentError } = await supabase
            .from('client_files')
            .select('client_id, file_path, bucket_id, coach_id') // Assuming bucket_id exists or default
            .eq('id', id)
            .eq('client_id', targetClientId)
            .single();

        if (assignmentError || !assignment) {
            return notFound(res, { message: 'File not found or access denied' });
        }

        // If this is a coach request, verify coach_id matches
        if (isCoach && coachIdHeader !== assignment.coach_id) {
            return forbidden(res, { message: 'Coach ID mismatch' });
        }

        // If it's an external link, return the URL directly
        if (isExternalLink(assignment.file_path)) {
            success(res, {
                message: 'File URL retrieved successfully',
                data: { url: assignment.file_path },
            });
            return;
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
        const { fileIds, clientIds } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });

        const targetCoachId = coachIdHeader as string;
        let targetClientIds: string[] = [];

        if (Array.isArray(clientIds) && clientIds.length > 0) {
            targetClientIds = clientIds;
        } else if (clientIdHeader) {
            targetClientIds = [clientIdHeader as string];
        } else {
            return forbidden(res, { message: 'x-client-id header or clientIds body param required' });
        }

        if (!fileIds || !Array.isArray(fileIds)) {
            return res.status(400).json({ success: false, message: 'Invalid fileIds' });
        }

        const supabase = getSupabaseClient();

        // Verify Relationships
        const { data: relations, error: relationError } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .in('client_id', targetClientIds);

        if (relationError || !relations || relations.length !== targetClientIds.length) {
            return forbidden(res, { message: 'One or more clients not assigned to this coach' });
        }

        // 1. Fetch metadata from coach_files
        const { data: coachFiles, error: fetchError } = await supabase
            .from('coach_files')
            .select('*')
            .in('id', fileIds)
            .eq('coach_id', targetCoachId);

        if (fetchError || !coachFiles || coachFiles.length === 0) {
            return res.status(404).json({ success: false, message: 'Source files not found' });
        }

        // 2. Create client copies (Cross Join)
        const assignments: any[] = [];
        for (const cid of targetClientIds) {
            for (const f of coachFiles) {
                assignments.push({
                    client_id: cid,
                    coach_id: targetCoachId,
                    filename: f.filename,
                    display_name: f.filename,
                    file_path: f.file_path,
                    mime_type: f.mime_type,
                    size: f.size
                });
            }
        }

        // Check for duplicates by file_path (same file already assigned)
        const { data: existingFiles } = await supabase
            .from('client_files')
            .select('client_id, file_path, filename')
            .in('client_id', targetClientIds);

        const existingSet = new Set(
            (existingFiles || []).map((f: any) => `${f.client_id}:${f.file_path}`)
        );

        // Filter out duplicates instead of renaming
        const newAssignments: any[] = [];
        const skippedFiles: string[] = [];

        for (const assignment of assignments) {
            const key = `${assignment.client_id}:${assignment.file_path}`;
            if (existingSet.has(key)) {
                skippedFiles.push(assignment.filename);
            } else {
                newAssignments.push(assignment);
                existingSet.add(key); // Prevent duplicates within same batch
            }
        }

        // Only insert non-duplicate assignments
        if (newAssignments.length > 0) {
            const { error } = await supabase
                .from('client_files')
                .insert(newAssignments);

            if (error) return res.status(500).json({ success: false, message: error.message });
        }

        // Return summary
        success(res, {
            message: 'Files assigned',
            data: {
                added: newAssignments.length,
                skipped: skippedFiles.length,
                skippedFiles: skippedFiles
            }
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
     * Update file metadata (filename)
     */
    updateFile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { filename } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!filename || typeof filename !== 'string') return res.status(400).json({ success: false, message: 'filename is required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Verify file exists and belongs to this coach/client
        const { data: existingFile, error: fetchError } = await supabase
            .from('client_files')
            .select('id')
            .eq('id', id)
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .single();

        if (fetchError || !existingFile) {
            return notFound(res, { message: 'File not found' });
        }

        // Update file metadata
        const { data: updatedFile, error: updateError } = await supabase
            .from('client_files')
            .update({ filename: filename.trim(), display_name: filename.trim() })
            .eq('id', id)
            .select()
            .single();

        if (updateError) return res.status(500).json({ success: false, message: updateError.message });

        success(res, {
            message: 'File updated successfully',
            data: { file: updatedFile },
        });
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

    /**
     * Create a new link (external URL) for a client
     */
    createLink: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { filename, url } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!filename) return res.status(400).json({ success: false, message: 'Filename is required' });
        if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

        // Validate URL format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return res.status(400).json({ success: false, message: 'URL must start with http:// or https://' });
        }

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

        // Store link in database with URL in file_path
        const { data: fileRecord, error: dbError } = await supabase
            .from('client_files')
            .insert({
                client_id: targetClientId,
                coach_id: targetCoachId,
                filename: filename,
                display_name: filename,
                file_path: url,
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
            data: { file: fileRecord },
        });
    },
};
