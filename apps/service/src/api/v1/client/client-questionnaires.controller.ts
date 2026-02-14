import { Request, Response } from 'express';
import { success, unauthorized, created, notFound, noContent, forbidden } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { createCoachNotification, resolveClientName } from '../../../services/notification.service';
import { NOTIFICATION_TYPES, NOTIFICATION_TITLES } from '@athli/shared-types/notification-constants';

export const clientQuestionnairesController = {
    /**
     * Get all questionnaires assigned to a client
     */
    getQuestionnaires: async (req: Request, res: Response) => {
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
            .from('client_questionnaires')
            .select('*')
            .eq('client_id', targetClientId);

        if (targetCoachId) {
            query = query.eq('coach_id', targetCoachId);
        }

        const { data: assignments, error } = await query;
        if (error) return res.status(500).json({ success: false, message: error.message });

        const questionnaires = assignments.map((a: any) => ({
            id: a.id,
            assignment_id: a.id,
            coach_id: a.coach_id,
            name: a.name,
            description: a.description,
            questions: a.questions,
            answers: a.answers || [],
            status: a.status || 'draft',
            sent_at: a.sent_at,
            completed_at: a.completed_at,
            assigned_at: a.created_at,
            created_at: a.created_at
        }));

        success(res, {
            message: 'Client questionnaires retrieved successfully',
            data: { questionnaires },
        });
    },

    /**
     * Assign questionnaires (Library or Private) (Coach Only)
     */
    /**
     * Assign questionnaires (Library or Private) (Coach Only)
     */
    assignQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { questionnaireIds, clientIds, name, description, questions } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });

        // Determine target clients
        let targetClientIds: string[] = [];
        if (Array.isArray(clientIds) && clientIds.length > 0) {
            targetClientIds = clientIds;
        } else if (clientIdHeader) {
            targetClientIds = [clientIdHeader as string];
        } else {
            return forbidden(res, { message: 'x-client-id header or clientIds body param required' });
        }

        const targetCoachId = coachIdHeader as string;
        const supabase = getSupabaseClient();

        // Verify Relations for all clients
        const { data: relations, error: relationError } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .in('client_id', targetClientIds);

        if (relationError || !relations || relations.length !== targetClientIds.length) {
            return forbidden(res, { message: 'One or more clients are not assigned to this coach' });
        }

        // 1. Private Questionnaire Creation (Single Client usually, but we can support bulk if needed)
        if (name) {
            const assignmentsToInsert: any[] = [];

            // Fetch existing questionnaires for renaming check (only name matters for private)
            const { data: existingItems } = await supabase
                .from('client_questionnaires')
                .select('client_id, name')
                .in('client_id', targetClientIds);

            // Track names used in this batch and existing ones
            const usedNames = new Set<string>();
            existingItems?.forEach(item => usedNames.add(`${item.client_id}:${item.name}`));

            for (const clientId of targetClientIds) {
                let finalName = name;
                let counter = 1;
                while (usedNames.has(`${clientId}:${finalName}`)) {
                    finalName = `${name} ${counter}`;
                    counter++;
                }
                usedNames.add(`${clientId}:${finalName}`);

                assignmentsToInsert.push({
                    client_id: clientId,
                    coach_id: targetCoachId,
                    name: finalName,
                    description,
                    questions: questions || [],
                });
            }

            const { data: createdItems, error } = await supabase
                .from('client_questionnaires')
                .insert(assignmentsToInsert)
                .select();

            if (error) return res.status(500).json({ success: false, message: error.message });
            return created(res, { message: 'Private questionnaire(s) created', data: { questionnaires: createdItems } });
        }

        // 2. Library Assignment
        if (!Array.isArray(questionnaireIds) || questionnaireIds.length === 0) return res.status(400).json({ success: false, message: 'questionnaireIds required' });

        const { data: libraryItems, error: fetchError } = await supabase
            .from('coach_questionnaires')
            .select('*')
            .in('id', questionnaireIds);

        if (fetchError) return res.status(500).json({ success: false, message: fetchError.message });
        if (!libraryItems || libraryItems.length === 0) return notFound(res, { message: 'No questionnaires found' });

        // Fetch existing assignments for renaming
        const { data: existingAssignments } = await supabase
            .from('client_questionnaires')
            .select('client_id, name')
            .in('client_id', targetClientIds);

        // Map for fast lookup: "clientId:itemName" -> true
        const existingMap = new Set<string>();
        if (existingAssignments) {
            existingAssignments.forEach((h: any) => existingMap.add(`${h.client_id}:${h.name}`));
        }

        const newAssignments: any[] = [];
        // Track names assigned IN THIS BATCH to prevent conflicts within the batch itself
        const batchMap = new Set<string>();

        // Cross-join clients * questionnaires
        for (const clientId of targetClientIds) {
            for (const item of libraryItems) {
                // Renaming Logic
                let finalName = item.name;
                let counter = 1;

                // Check against DB existing items AND items we are about to insert in this batch
                while (
                    existingMap.has(`${clientId}:${finalName}`) ||
                    batchMap.has(`${clientId}:${finalName}`)
                ) {
                    finalName = `${item.name} ${counter}`;
                    counter++;
                }

                // Lock this name for this batch
                batchMap.add(`${clientId}:${finalName}`);

                newAssignments.push({
                    client_id: clientId,
                    coach_id: targetCoachId,
                    name: finalName,
                    description: item.description,
                    questions: item.questions,
                    status: 'pending',
                    sent_at: new Date().toISOString(),
                });
            }
        }

        if (newAssignments.length === 0) {
            return success(res, { message: 'No new questionnaires to assign (all duplicates skipped or empty)' });
        }

        const { error: insertError } = await supabase.from('client_questionnaires').insert(newAssignments);
        if (insertError) return res.status(500).json({ success: false, message: insertError.message });

        created(res, { message: 'Questionnaires assigned successfully' });
    },

    /**
     * Submit a questionnaire (client submits their answers)
     * Supports both JSON-only and multipart/form-data (for file uploads)
     */
    submitQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const isCoach = coachIdHeader && coachIdHeader === userId;
        const targetClientId = isCoach ? (clientIdHeader as string) : userId;

        if (!targetClientId) return forbidden(res, { message: 'Target client unknown' });

        const supabase = getSupabaseClient();

        // Fetch assignment details
        const { data: assignmentDetails, error: detailsError } = await supabase
            .from('client_questionnaires')
            .select('client_id, coach_id, name')
            .eq('id', id)
            .eq('client_id', targetClientId)
            .single();

        if (detailsError || !assignmentDetails) return notFound(res, { message: 'Assignment not found' });

        // If this is a coach request, verify coach_id matches
        if (isCoach && coachIdHeader !== assignmentDetails.coach_id) {
            return forbidden(res, { message: 'Coach ID mismatch' });
        }

        const targetCoachId = assignmentDetails.coach_id;

        // Parse answers from body (either direct JSON or from form-data)
        let responses: any[] = [];
        try {
            if (req.body.answers) {
                responses = typeof req.body.answers === 'string'
                    ? JSON.parse(req.body.answers)
                    : req.body.answers;
            } else if (req.body.responses) {
                responses = typeof req.body.responses === 'string'
                    ? JSON.parse(req.body.responses)
                    : req.body.responses;
            }
        } catch (parseError) {
            return res.status(400).json({ success: false, message: 'Invalid answers format' });
        }

        // Get uploaded files if any (from multer.any() - returns array, not object)
        const files = (req as any).files as Express.Multer.File[] | undefined;

        // Helper to upload a single file to the specified bucket
        const uploadFileToBucket = async (
            file: Express.Multer.File,
            bucket: string,
            pathPrefix: string
        ): Promise<string> => {
            const fileExtension = file.originalname?.split('.').pop() || 'jpg';
            const dateStr = new Date().toISOString().split('T')[0];
            const uniqueFileName = `${pathPrefix}/${dateStr}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
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
            console.log('[submitQuestionnaire] Processing submission for questionnaire:', id);
            console.log('[submitQuestionnaire] Number of responses:', responses.length);
            console.log('[submitQuestionnaire] Response formats:', responses.map((r: any) => r.format));

            // Process files and update answers with file paths
            // multer.any() returns files as a flat array with fieldname property
            if (files && files.length > 0) {
                for (const file of files) {
                    const fieldName = file.fieldname;

                    // Parse field name to extract question ID and file type
                    // Format: questionId_type_index (e.g., "abc123_images_0" or "abc123_signature")
                    // For progressPhoto: "abc123_progressPhoto_front"
                    const parts = fieldName.split('_');
                    const questionId = parts[0];
                    const fileType = parts[1];
                    const subType = parts[2]; // index for images/videos, angle for progressPhoto

                    // Find the answer for this question
                    const answerIndex = responses.findIndex((a: any) => a.questionId === questionId);
                    if (answerIndex === -1) continue;

                    if (fileType === 'progressPhoto') {
                        // Upload progress photo to client_photos bucket
                        // Path: {client_id}/{coach_id}/{date}/{angle}/...
                        const angle = subType as 'front' | 'back' | 'side';
                        const filePath = await uploadFileToBucket(
                            file,
                            'client_photos',
                            `${targetClientId}/${targetCoachId}/${new Date().toISOString().split('T')[0]}/${angle}`
                        );

                        // Initialize answer object if needed
                        if (typeof responses[answerIndex].answer !== 'object' || !responses[answerIndex].answer) {
                            responses[answerIndex].answer = {};
                        }
                        responses[answerIndex].answer[angle] = filePath;
                    } else if (fileType === 'signature') {
                        // Upload signature to form_files bucket
                        // Path: {client_id}/{coach_id}/signatures/{questionnaire_id}/...
                        const filePath = await uploadFileToBucket(
                            file,
                            'form_files',
                            `${targetClientId}/${targetCoachId}/signatures/${id}`
                        );
                        responses[answerIndex].answer = filePath;
                    } else if (fileType === 'images' || fileType === 'videos') {
                        // Upload media to form_files bucket
                        // Path: {client_id}/{coach_id}/{type}/{questionnaire_id}/...
                        const filePath = await uploadFileToBucket(
                            file,
                            'form_files',
                            `${targetClientId}/${targetCoachId}/${fileType}/${id}`
                        );

                        // Initialize array if needed
                        if (!Array.isArray(responses[answerIndex].answer)) {
                            responses[answerIndex].answer = [];
                        }

                        // Add to array at the correct index
                        const mediaIndex = parseInt(subType, 10);
                        if (!isNaN(mediaIndex)) {
                            // Ensure array is large enough
                            while (responses[answerIndex].answer.length <= mediaIndex) {
                                responses[answerIndex].answer.push(null);
                            }
                            responses[answerIndex].answer[mediaIndex] = filePath;
                        } else {
                            responses[answerIndex].answer.push(filePath);
                        }
                    }
                }

                // Clean up any null values from media arrays
                for (const response of responses) {
                    if (Array.isArray(response.answer)) {
                        response.answer = response.answer.filter((item: any) => item !== null);
                    }
                }
            }

            // Handle base64 signatures that were sent directly in answers (not as file uploads)
            for (let i = 0; i < responses.length; i++) {
                const response = responses[i];
                if (
                    response.format === 'signature' &&
                    typeof response.answer === 'string' &&
                    response.answer.startsWith('data:')
                ) {
                    try {
                        // Parse the base64 data URI
                        const matches = response.answer.match(/^data:([^;]+);base64,(.+)$/);
                        if (matches) {
                            const mimeType = matches[1];
                            const base64Data = matches[2];
                            const buffer = Buffer.from(base64Data, 'base64');

                            // Determine file extension
                            const extensionMap: Record<string, string> = {
                                'image/png': 'png',
                                'image/jpeg': 'jpg',
                                'image/jpg': 'jpg',
                            };
                            const extension = extensionMap[mimeType] || 'png';

                            // Upload to form_files bucket
                            // Path: {client_id}/{coach_id}/signatures/{questionnaire_id}/{date}/...
                            const dateStr = new Date().toISOString().split('T')[0];
                            const uniqueFileName = `${targetClientId}/${targetCoachId}/signatures/${id}/${dateStr}/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

                            const { error: uploadError } = await supabase.storage
                                .from('form_files')
                                .upload(uniqueFileName, buffer, {
                                    contentType: mimeType,
                                    upsert: false,
                                });

                            if (!uploadError) {
                                responses[i].answer = uniqueFileName;
                            }
                        }
                    } catch (sigError) {
                        console.error('Failed to process signature:', sigError);
                        // Keep the base64 data as-is if upload fails
                    }
                }
            }

            // Handle base64 images
            for (let i = 0; i < responses.length; i++) {
                const response = responses[i];
                if (response.format === 'images' && Array.isArray(response.answer)) {
                    const uploadedPaths: string[] = [];
                    for (const item of response.answer) {
                        if (typeof item === 'string' && item.startsWith('data:')) {
                            try {
                                // Parse and upload base64
                                const matches = item.match(/^data:([^;]+);base64,(.+)$/);
                                if (matches) {
                                    const mimeType = matches[1];
                                    const base64Data = matches[2];
                                    const buffer = Buffer.from(base64Data, 'base64');
                                    const extension = mimeType.split('/')[1] || 'jpg';
                                    // Path: {client_id}/{coach_id}/images/{questionnaire_id}/...
                                    const filePath = `${targetClientId}/${targetCoachId}/images/${id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

                                    const { error: uploadError } = await supabase.storage
                                        .from('form_files')
                                        .upload(filePath, buffer, { contentType: mimeType });

                                    if (!uploadError) {
                                        uploadedPaths.push(filePath);
                                    }
                                }
                            } catch (imgError) {
                                console.error('Failed to process image:', imgError);
                            }
                        } else if (typeof item === 'string' && item !== '__FILE_UPLOAD__') {
                            uploadedPaths.push(item); // Already a URL/path
                        }
                    }
                    responses[i].answer = uploadedPaths;
                }
            }

            // Handle base64 progress photos
            for (let i = 0; i < responses.length; i++) {
                const response = responses[i];
                if (response.format === 'progressPhoto' && typeof response.answer === 'object' && response.answer) {
                    const progressAnswer = response.answer as { front?: string; back?: string; side?: string };

                    for (const angle of ['front', 'back', 'side'] as const) {
                        const value = progressAnswer[angle];
                        if (typeof value === 'string' && value.startsWith('data:')) {
                            try {
                                const matches = value.match(/^data:([^;]+);base64,(.+)$/);
                                if (matches) {
                                    const mimeType = matches[1];
                                    const base64Data = matches[2];
                                    const buffer = Buffer.from(base64Data, 'base64');
                                    const extension = mimeType.split('/')[1] || 'jpg';
                                    const dateStr = new Date().toISOString().split('T')[0];
                                    // Path: {client_id}/{coach_id}/{date}/{angle}/...
                                    const filePath = `${targetClientId}/${targetCoachId}/${dateStr}/${angle}/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

                                    const { error: uploadError } = await supabase.storage
                                        .from('client_photos')
                                        .upload(filePath, buffer, { contentType: mimeType });

                                    if (!uploadError) {
                                        progressAnswer[angle] = filePath;
                                    }
                                }
                            } catch (photoError) {
                                console.error(`Failed to process ${angle} photo:`, photoError);
                            }
                        }
                    }
                    responses[i].answer = progressAnswer;
                }
            }

            // Handle progress photo log entry if any progressPhoto answers exist
            // Helper to check if a path is a valid upload (not a placeholder or base64)
            const isValidPath = (path: any): path is string =>
                typeof path === 'string' && path !== '__FILE_UPLOAD__' && !path.startsWith('data:') && path.length > 0;

            const progressPhotoAnswer = responses.find((a: any) =>
                a.format === 'progressPhoto' &&
                typeof a.answer === 'object' &&
                a.answer !== null &&
                (isValidPath(a.answer.front) || isValidPath(a.answer.back) || isValidPath(a.answer.side))
            );

            if (progressPhotoAnswer) {
                const dateStr = new Date().toISOString().split('T')[0];
                const photoPaths: any = {};

                if (isValidPath(progressPhotoAnswer.answer.front)) {
                    photoPaths.front_photo_path = progressPhotoAnswer.answer.front;
                }
                if (isValidPath(progressPhotoAnswer.answer.side)) {
                    photoPaths.side_photo_path = progressPhotoAnswer.answer.side;
                }
                if (isValidPath(progressPhotoAnswer.answer.back)) {
                    photoPaths.back_photo_path = progressPhotoAnswer.answer.back;
                }

                // Only insert if we have at least one valid path
                if (Object.keys(photoPaths).length > 0) {
                    await supabase
                        .from('client_photo_logs')
                        .upsert({
                            client_id: targetClientId,
                            coach_id: targetCoachId,
                            date: dateStr,
                            ...photoPaths,
                        }, {
                            onConflict: 'client_id,date'
                        });
                }
            }

            // Update the questionnaire with answers
            const { data, error } = await supabase
                .from('client_questionnaires')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    answers: responses,
                })
                .eq('id', id)
                .eq('client_id', targetClientId)
                .eq('coach_id', targetCoachId)
                .select()
                .single();

            if (error) return res.status(500).json({ success: false, message: error.message });

            // Send notification for client submissions only
            if (!isCoach) {
                resolveClientName(targetClientId).then((clientName) => {
                    if (clientName) {
                        createCoachNotification({
                            coachId: targetCoachId,
                            clientId: targetClientId,
                            notificationType: NOTIFICATION_TYPES.questionnaire_completed,
                            title: NOTIFICATION_TITLES.questionnaire_completed,
                            description: `${clientName} completed a questionnaire`,
                            metadata: { questionnaire_id: id, name: assignmentDetails.name },
                        });
                    }
                });
            }

            success(res, {
                message: 'Questionnaire submitted successfully',
                data: { assignment: data },
            });
        } catch (uploadError: any) {
            console.error('[submitQuestionnaire] Error:', uploadError);
            console.error('[submitQuestionnaire] Stack:', uploadError.stack);
            return res.status(500).json({ success: false, message: `Processing failed: ${uploadError.message}` });
        }
    },

    /**
     * Delete (unassign) a questionnaire
     */
    deleteAssignment: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { questionnaireIds } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!Array.isArray(questionnaireIds)) return res.status(400).json({ success: false, message: 'questionnaireIds array required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('client_questionnaires')
            .delete()
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .in('id', questionnaireIds);

        if (error) return res.status(500).json({ success: false, message: error.message });
        noContent(res);
    },

    /**
     * Get a single questionnaire by ID
     * Supports both coach access (x-coach-id + x-client-id) and client access (x-client-id only)
     */
    getQuestionnaireById: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
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
            .from('client_questionnaires')
            .select('*')
            .eq('id', id)
            .eq('client_id', targetClientId);

        if (targetCoachId) {
            query = query.eq('coach_id', targetCoachId);
        }

        const { data: questionnaire, error } = await query.single();

        if (error || !questionnaire) return notFound(res, { message: 'Questionnaire not found' });

        success(res, {
            message: 'Questionnaire retrieved successfully',
            data: {
                id: questionnaire.id,
                name: questionnaire.name,
                description: questionnaire.description,
                questions: questionnaire.questions || [],
                answers: questionnaire.answers || [],
                status: questionnaire.status || 'draft',
                sentAt: questionnaire.sent_at,
                completedAt: questionnaire.completed_at,
            },
        });
    },

    /**
     * Update a questionnaire (questions, etc.)
     */
    updateQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { questions, name, description } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Build update object with only provided fields
        const updateData: any = {};
        if (questions !== undefined) updateData.questions = questions;
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const { data, error } = await supabase
            .from('client_questionnaires')
            .update(updateData)
            .eq('id', id)
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data) return notFound(res, { message: 'Questionnaire not found' });

        success(res, {
            message: 'Questionnaire updated successfully',
            data: {
                id: data.id,
                name: data.name,
                description: data.description,
                questions: data.questions || [],
            },
        });
    },

    /**
     * Create a client-specific questionnaire (not from library)
     */
    createQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');
        const { name, description, questions } = req.body;

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });
        if (!name) return res.status(400).json({ success: false, message: 'name is required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Verify relationship
        const { data: relation } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', targetCoachId)
            .eq('client_id', targetClientId)
            .single();

        if (!relation) return forbidden(res, { message: 'Client not assigned to this coach' });

        // Check for duplicate names and rename if needed
        const { data: existingQuestionnaires } = await supabase
            .from('client_questionnaires')
            .select('name')
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId);

        const existingNames = new Set((existingQuestionnaires || []).map((q: any) => q.name));
        let finalName = name;
        let counter = 1;
        while (existingNames.has(finalName)) {
            finalName = `${name} ${counter}`;
            counter++;
        }

        const { data: questionnaire, error } = await supabase
            .from('client_questionnaires')
            .insert({
                client_id: targetClientId,
                coach_id: targetCoachId,
                name: finalName,
                description: description || '',
                questions: questions || [],
            })
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });

        created(res, {
            message: 'Questionnaire created successfully',
            data: {
                id: questionnaire.id,
                name: questionnaire.name,
                description: questionnaire.description,
                questions: questionnaire.questions || [],
            },
        });
    },

    /**
     * Send a questionnaire to a client (update status from draft to pending)
     */
    sendQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Update status to pending and set sent_at
        const { data, error } = await supabase
            .from('client_questionnaires')
            .update({
                status: 'pending',
                sent_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .select()
            .single();

        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!data) return notFound(res, { message: 'Questionnaire not found' });

        success(res, {
            message: 'Questionnaire sent successfully',
            data: {
                id: data.id,
                name: data.name,
                status: data.status,
                sent_at: data.sent_at,
            },
        });
    },

    /**
     * Resend a questionnaire (duplicate and send again)
     * Creates a new questionnaire with same questions but reset status
     */
    resendQuestionnaire: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const clientIdHeader = req.header('x-client-id');
        const coachIdHeader = req.header('x-coach-id');

        if (!coachIdHeader || coachIdHeader !== userId) return unauthorized(res, { message: 'Unauthorized' });
        if (!clientIdHeader) return forbidden(res, { message: 'x-client-id required' });

        const targetCoachId = coachIdHeader as string;
        const targetClientId = clientIdHeader as string;

        const supabase = getSupabaseClient();

        // Fetch the original questionnaire
        const { data: original, error: fetchError } = await supabase
            .from('client_questionnaires')
            .select('*')
            .eq('id', id)
            .eq('client_id', targetClientId)
            .eq('coach_id', targetCoachId)
            .single();

        if (fetchError || !original) return notFound(res, { message: 'Questionnaire not found' });

        // Create a new questionnaire with same questions but reset fields
        const { data: newQuestionnaire, error: insertError } = await supabase
            .from('client_questionnaires')
            .insert({
                client_id: targetClientId,
                coach_id: targetCoachId,
                name: original.name,
                description: original.description,
                questions: original.questions,
                status: 'pending',
                sent_at: new Date().toISOString(),
                answers: [],
            })
            .select()
            .single();

        if (insertError) return res.status(500).json({ success: false, message: insertError.message });

        created(res, {
            message: 'Questionnaire resent successfully',
            data: {
                id: newQuestionnaire.id,
                name: newQuestionnaire.name,
                status: newQuestionnaire.status,
                sent_at: newQuestionnaire.sent_at,
            },
        });
    },

    /**
     * Get a signed URL for questionnaire media (images, videos, signatures, progress photos)
     * Supports both form_files and client_photos buckets
     */
    getMediaUrl: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { bucket, path } = req.query;

        if (!bucket || !path) {
            return res.status(400).json({ success: false, message: 'bucket and path query params required' });
        }

        const bucketName = String(bucket);
        const filePath = String(path);

        // Only allow specific buckets for security
        if (bucketName !== 'form_files' && bucketName !== 'client_photos') {
            return res.status(400).json({ success: false, message: 'Invalid bucket' });
        }

        const supabase = getSupabaseClient();

        // Generate signed URL (24 hours validity)
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 60 * 60 * 24);

        if (error) {
            console.error('[getMediaUrl] Error creating signed URL:', error);
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Signed URL generated successfully',
            data: { url: data.signedUrl },
        });
    },
};
