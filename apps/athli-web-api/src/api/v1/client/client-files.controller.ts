import { Request, Response } from 'express';
import { success, unauthorized, notFound, created, noContent } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const clientFilesController = {
    /**
     * Get all files assigned to a client
     */
    getFiles: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const isCoachView = !!req.header('x-client-id');

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        let query = supabase
            .from('client_file_assignments')
            .select('*, file:coach_files(*)')
            .eq('client_id', targetClientId);

        if (isCoachView) {
            query = query.eq('coach_id', userId);
        }

        const { data: assignments, error } = await query;

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Client files retrieved successfully',
            data: { assignments },
        });
    },

    /**
     * Get signed URL for file access
     */
    getFileUrl: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params; // This is the file ID

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // 1. Verify assignment exists for this file
        // We need the file_path from coach_files to generate the URL.
        const { data: assignment, error: assignmentError } = await supabase
            .from('client_file_assignments')
            .select('client_id, file:coach_files(file_path)')
            .eq('file_id', id)
            .eq('client_id', userId)
            .single();

        if (assignmentError || !assignment) {
            return notFound(res, { message: 'File not found or access denied' });
        }

        const file = assignment.file as any;
        if (!file || !file.file_path) {
            return res.status(500).json({ success: false, message: 'File record invalid' });
        }

        // 2. Generate signed URL
        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('coach_files')
            .createSignedUrl(file.file_path, 3600);

        if (urlError || !signedUrlData) {
            return res.status(500).json({ success: false, message: 'Failed to generate file URL' });
        }

        success(res, {
            message: 'File URL generated successfully',
            data: { url: signedUrlData.signedUrl },
        });
    },

    /**
     * Assign file(s) to a client
     */
    assignFile: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;
        const { fileIds } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Coach assigning file to client
        const isCoachView = !!req.header('x-client-id');

        if (!isCoachView) {
            return res.status(403).json({ success: false, message: 'Clients cannot assign files' });
        }

        if (!fileIds || !Array.isArray(fileIds)) {
            return res.status(400).json({ success: false, message: 'Invalid fileIds' });
        }

        const assignments = fileIds.map((fileId: string) => ({
            client_id: targetClientId,
            coach_id: userId,
            file_id: fileId,
            assigned_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('client_file_assignments')
            .upsert(assignments, { onConflict: 'client_id,file_id' }) // Prevent duplicates
            .select();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Files assigned successfully',
            data: { assignments: data },
        });
    },

    /**
     * Delete (unassign) a file
     */
    deleteAssignment: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const targetClientId = req.header('x-client-id') ? String(req.header('x-client-id')) : userId;

        const supabase = getSupabaseClient();
        const { id } = req.params; // Currently Route maps /:id to DELETE. But frontend sends fileIds array in body for bulk delete?
        // Frontend client-file-service.ts deleteClientFiles uses BODY { fileIds: [] }.
        // The REST standard DELETE often ignores body or only supports single resource.
        // However, the `client-form-service` also sent IDs in body.
        // And my controller `deleteAssignment` in forms used `req.params.id` expecting ONE id.
        // BUT `client-form-service` sent `checkInIds` array!
        // CHECK `deleteClientCheckIns`: `body: JSON.stringify({ checkInIds: data.checkInIds })`.
        // AND checks `client-check-ins.controller.ts`:
        // `const { id } = req.params;`
        // `query = supabase.from('client_checkin_assignments').delete().eq('id', id);`
        // THIS IS A BUG/MISMATCH. 
        // The frontend sends a LIST of IDs for bulk delete, but my controller implementation expects a SINGLE ID in Params!
        // The previous frontend service for coach forms/files supports BULK deletion.
        // I should support BULK deletion in the controller too via BODY, or change frontend to loop.
        // Modifying Controller to support Body IDs is better for bulk.
        // AND the routes were DELETE /:id. That only matches if there is an ID in URL.
        // If frontend calls DELETE /client/check-ins (without ID) + Body, it might hit 404 if no route defined for DELETE /
        // I need to add DELETE / route for bulk?
        // OR the frontend calls specific IDs.
        // Let's check frontend service again.
        // client-form-service: `await apiFetch('/client/check-ins?clientId=...', { method: 'DELETE', body: ...Ids })`.
        // NO ID in URL.
        // BUT I defined route DELETE `/:id`.
        // So `DELETE /client/check-ins` will FAIL (404) because I only defined `/:id`.
        // I NEED to define `DELETE /` (or similar) to handle bulk via body.

        // I will implement `unassignFiles` mapped to DELETE / which reads body `fileIds`.

        const { fileIds } = req.body;

        // Support single ID from params if available, or list from body
        // But express routing separates /:id vs /.
        // This function is for `deleteAssignment` (singular) or I rename it `deleteAssignments` (plural).

        // Since I'm editing `client-files.controller.ts` now, I will implement bulk support.

        const isCoachView = !!req.header('x-client-id');

        if (!isCoachView) {
            return res.status(403).json({ success: false, message: 'Clients cannot delete assignments' });
        }

        let idsToDelete = [];
        if (req.params.id) idsToDelete.push(req.params.id); // Assuming param ID is assignment ID? Wait. 
        // For files, `client-file-service` sends `fileIds`. In `client_file_assignments`, is the ID the assignment ID or file ID?
        // The `client-file-service` sends `fileIds` (from the file table).
        // The table `client_file_assignments` has `file_id`.
        // So we delete `where file_id in (ids)`.
        // `client-form-service` sends `checkInIds` which are ASSIGNMENT IDs (mapped in `getClientCheckIns`).
        // `client-file-service` sends `fileIds`.

        if (fileIds && Array.isArray(fileIds)) {
            idsToDelete = fileIds;
        }

        if (idsToDelete.length === 0) {
            return res.status(400).json({ success: false, message: 'No IDs provided' });
        }

        // We delete by file_id (not assignment id) because frontend tracks files by file ID (likely).
        // Let's check `client-files.controller.ts` `getFiles`.
        // `select('*, file:coach_files(*)')` -> returns assignment objects.
        // Frontend `coach-file-service` (viewed step 952) `getClientFiles`:
        // `return response.data.assignments.map(a => ({ ... a.file, ... }))`
        // So frontend uses File IDs, NOT Assignment IDs for files?
        // Wait, `coach-file-service` line 151: `id: a.habit.id`.
        // But `client-file-service` (step 1006) uses `fileIds`.
        // Assuming `fileIds` refers to the `coach_files.id`.
        // So we delete `client_file_assignments` where `file_id` is in the list.

        let query = supabase.from('client_file_assignments').delete().in('file_id', idsToDelete);

        if (isCoachView) {
            query = query.eq('coach_id', userId).eq('client_id', targetClientId);
        }

        const { error } = await query;
        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
        noContent(res);
    },
};
