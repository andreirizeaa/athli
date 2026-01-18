import { Request, Response } from 'express';
import { success, unauthorized, created, badRequest } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachMessagingController = {
    /**
     * Get all conversations for a coach
     */
    getConversations: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { includeArchived = false, limit = 100 } = req.body;

        try {
            const supabase = getSupabaseClient();

            // Query conversations where user is a participant (as coach or client)
            const { data: conversations, error: conversationsError } = await supabase
                .from('conversations')
                .select('*')
                .or(`coach_id.eq.${userId},client_id.eq.${userId}`)
                .order('last_message_at', { ascending: false, nullsFirst: false })
                .limit(limit);

            if (conversationsError) throw conversationsError;
            if (!conversations) {
                success(res, { message: 'Conversations retrieved successfully', data: { conversations: [] } });
                return;
            }

            // Get participant settings
            const { data: participants, error: participantsError } = await supabase
                .from('conversation_participants')
                .select('*')
                .eq('user_id', userId);

            if (participantsError) throw participantsError;

            // Get read receipts for unread count (current user)
            const { data: readReceipts, error: receiptsError } = await supabase
                .from('message_read_receipts')
                .select('*')
                .eq('user_id', userId);

            if (receiptsError) throw receiptsError;

            // Get all read receipts for these conversations (to compute last_message_is_read)
            const conversationIds = conversations.map((c) => c.id);
            const { data: allReadReceipts, error: allReceiptsError } = await supabase
                .from('message_read_receipts')
                .select('*')
                .in('conversation_id', conversationIds);

            if (allReceiptsError) throw allReceiptsError;

            // Get other user IDs (client if user is coach, coach if user is client)
            const otherUserIds = conversations.map((conv) =>
                conv.coach_id === userId ? conv.client_id : conv.coach_id,
            );

            const { data: profiles, error: profilesError } = await supabase
                .from('user_profiles')
                .select('id, name, profile_picture_url')
                .in('id', otherUserIds);

            if (profilesError) throw profilesError;

            // Transform and compute fields
            const result = await Promise.all(
                conversations.map(async (conv) => {
                    const isCoach = conv.coach_id === userId;
                    const otherUserId = isCoach ? conv.client_id : conv.coach_id;

                    // Find participant settings
                    const participantSettings = participants?.find(
                        (p) => p.conversation_id === conv.id,
                    );

                    // Skip if archived (unless includeArchived is true)
                    if (!includeArchived && participantSettings?.is_archived) {
                        return null;
                    }

                    // Find other user's profile
                    const otherProfile = profiles?.find((p) => p.id === otherUserId);

                    // Calculate unread count
                    const receipt = readReceipts?.find((r) => r.conversation_id === conv.id);
                    let unreadCount = 0;

                    if (!receipt || !receipt.last_read_at) {
                        // No receipt = all messages are unread
                        const { count } = await supabase
                            .from('messages')
                            .select('*', { count: 'exact', head: true })
                            .eq('conversation_id', conv.id)
                            .neq('sender_id', userId);

                        unreadCount = count || 0;
                    } else {
                        // Count messages sent after last read time
                        const { count } = await supabase
                            .from('messages')
                            .select('*', { count: 'exact', head: true })
                            .eq('conversation_id', conv.id)
                            .neq('sender_id', userId)
                            .gte('sent_at', new Date(receipt.last_read_at).toISOString());

                        unreadCount = count || 0;
                    }

                    // Compute last_message_is_read: true if we sent the last message and other user has read it
                    let lastMessageIsRead = false;
                    if (conv.last_message_sender_id === userId && conv.last_message_at) {
                        const otherReceipt = allReadReceipts?.find(
                            (r) => r.conversation_id === conv.id && r.user_id === otherUserId,
                        );
                        if (otherReceipt?.last_read_at) {
                            lastMessageIsRead =
                                new Date(otherReceipt.last_read_at) >= new Date(conv.last_message_at);
                        }
                    }

                    return {
                        ...conv,
                        other_user_id: otherUserId,
                        other_user_name: otherProfile?.name || 'Unknown',
                        other_user_avatar: otherProfile?.profile_picture_url,
                        unread_count: unreadCount,
                        last_message_is_read: lastMessageIsRead,
                    };
                }),
            );

            // Filter out nulls (archived conversations when includeArchived=false)
            const filteredConversations = result.filter((conv) => conv !== null);

            success(res, {
                message: 'Conversations retrieved successfully',
                data: { conversations: filteredConversations },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Get messages for a conversation
     */
    getMessages: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { conversationId } = req.params;
        const { limit = '50', offset = '0', beforeTimestamp } = req.query;

        if (!conversationId) {
            badRequest(res, { message: 'Conversation ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            // Verify user is participant in this conversation
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .or(`coach_id.eq.${userId},client_id.eq.${userId}`)
                .single();

            if (convError || !conversation) {
                unauthorized(res, { message: 'You do not have access to this conversation' });
                return;
            }

            let query = supabase
                .from('messages')
                .select(
                    `
                    *,
                    attachments:message_attachments(*),
                    reactions:message_reactions(*),
                    parent_message:messages!parent_message_id(id, content, message_type, sender_id, sent_at, is_deleted, attachments:message_attachments(*))
                `,
                )
                .eq('conversation_id', conversationId)
                .or('is_deleted.is.null,is_deleted.eq.false')  // Filter out soft-deleted messages
                .order('sent_at', { ascending: false })
                .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

            // Optional: Load messages before a certain timestamp (for pagination)
            if (beforeTimestamp) {
                query = query.lt('sent_at', new Date(beforeTimestamp as string).toISOString());
            }

            const { data: messages, error } = await query;

            if (error) throw error;

            success(res, {
                message: 'Messages retrieved successfully',
                data: { messages: messages || [] },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Send a message
     */
    sendMessage: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { conversationId, content, messageType = 'text', parentMessageId } = req.body;

        if (!conversationId) {
            badRequest(res, { message: 'Conversation ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            // Verify user is participant in this conversation
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .or(`coach_id.eq.${userId},client_id.eq.${userId}`)
                .single();

            if (convError || !conversation) {
                unauthorized(res, { message: 'You do not have access to this conversation' });
                return;
            }

            // Create message
            const { data: message, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: userId,
                    content,
                    message_type: messageType,
                    parent_message_id: parentMessageId,
                    status: 'sent',
                })
                .select(`
                    *,
                    attachments:message_attachments(*),
                    reactions:message_reactions(*),
                    parent_message:messages!parent_message_id(id, content, message_type, sender_id, sent_at, is_deleted, attachments:message_attachments(*))
                `)
                .single();

            if (error) throw error;

            created(res, {
                message: 'Message sent successfully',
                data: { message },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Add reaction to a message
     */
    addReaction: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { messageId, conversationId, reaction } = req.body;

        if (!messageId || !conversationId || !reaction) {
            badRequest(res, { message: 'Message ID, conversation ID, and reaction are required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            // Verify user is participant in this conversation
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .or(`coach_id.eq.${userId},client_id.eq.${userId}`)
                .single();

            if (convError || !conversation) {
                unauthorized(res, { message: 'You do not have access to this conversation' });
                return;
            }

            // Add or update reaction
            const { data, error } = await supabase
                .from('message_reactions')
                .upsert(
                    {
                        message_id: messageId,
                        conversation_id: conversationId,
                        user_id: userId,
                        reaction,
                    },
                    {
                        onConflict: 'message_id,user_id',
                    },
                )
                .select()
                .single();

            if (error) throw error;

            created(res, {
                message: 'Reaction added successfully',
                data: { reaction: data },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Remove reaction from a message
     */
    removeReaction: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { messageId } = req.params;

        if (!messageId) {
            badRequest(res, { message: 'Message ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            const { error } = await supabase
                .from('message_reactions')
                .delete()
                .eq('message_id', messageId)
                .eq('user_id', userId);

            if (error) throw error;

            success(res, { message: 'Reaction removed successfully' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Mark conversation as read
     */
    markConversationAsRead: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { conversationId } = req.params;

        if (!conversationId) {
            badRequest(res, { message: 'Conversation ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            // Verify user is participant in this conversation
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .or(`coach_id.eq.${userId},client_id.eq.${userId}`)
                .single();

            if (convError || !conversation) {
                unauthorized(res, { message: 'You do not have access to this conversation' });
                return;
            }

            // Get latest message in conversation
            const { data: messages, error: messagesError } = await supabase
                .from('messages')
                .select('id, sent_at')
                .eq('conversation_id', conversationId)
                .order('sent_at', { ascending: false })
                .limit(1);

            if (messagesError) throw messagesError;
            if (!messages || messages.length === 0) {
                success(res, { message: 'No messages to mark as read' });
                return;
            }

            const latestMessage = messages[0];

            // Update read receipt (Supabase auto-detects unique constraint)
            const { error: receiptError } = await supabase
                .from('message_read_receipts')
                .upsert({
                    conversation_id: conversationId,
                    user_id: userId,
                    last_read_message_id: latestMessage.id,
                    last_read_at: new Date().toISOString(),
                });

            if (receiptError) throw receiptError;

            success(res, { message: 'Conversation marked as read' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Archive a conversation
     */
    archiveConversation: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { conversationId } = req.params;

        if (!conversationId) {
            badRequest(res, { message: 'Conversation ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            const { error } = await supabase
                .from('conversation_participants')
                .update({
                    is_archived: true,
                    archived_at: new Date().toISOString(),
                })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            if (error) throw error;

            success(res, { message: 'Conversation archived successfully' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Unarchive a conversation
     */
    unarchiveConversation: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { conversationId } = req.params;

        if (!conversationId) {
            badRequest(res, { message: 'Conversation ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            const { error } = await supabase
                .from('conversation_participants')
                .update({
                    is_archived: false,
                    archived_at: null,
                })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            if (error) throw error;

            success(res, { message: 'Conversation unarchived successfully' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Delete a message (soft delete)
     */
    deleteMessage: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { messageId } = req.params;

        if (!messageId) {
            badRequest(res, { message: 'Message ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            const { error } = await supabase
                .from('messages')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString(),
                    deleted_by_sender: true,
                })
                .eq('id', messageId)
                .eq('sender_id', userId);

            if (error) throw error;

            success(res, { message: 'Message deleted successfully' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Pin a conversation
     */
    pinConversation: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { conversationId } = req.params;

        if (!conversationId) {
            badRequest(res, { message: 'Conversation ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            const { error } = await supabase
                .from('conversation_participants')
                .update({
                    is_pinned: true,
                    pinned_at: new Date().toISOString(),
                })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            if (error) throw error;

            success(res, { message: 'Conversation pinned successfully' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Unpin a conversation
     */
    unpinConversation: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { conversationId } = req.params;

        if (!conversationId) {
            badRequest(res, { message: 'Conversation ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            const { error } = await supabase
                .from('conversation_participants')
                .update({
                    is_pinned: false,
                    pinned_at: null,
                })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            if (error) throw error;

            success(res, { message: 'Conversation unpinned successfully' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Mute a conversation
     */
    muteConversation: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { conversationId } = req.params;

        if (!conversationId) {
            badRequest(res, { message: 'Conversation ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            const { error } = await supabase
                .from('conversation_participants')
                .update({
                    is_muted: true,
                    muted_at: new Date().toISOString(),
                })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            if (error) throw error;

            success(res, { message: 'Conversation muted successfully' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Unmute a conversation
     */
    unmuteConversation: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const { conversationId } = req.params;

        if (!conversationId) {
            badRequest(res, { message: 'Conversation ID is required' });
            return;
        }

        try {
            const supabase = getSupabaseClient();

            const { error } = await supabase
                .from('conversation_participants')
                .update({
                    is_muted: false,
                    muted_at: null,
                })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            if (error) throw error;

            success(res, { message: 'Conversation unmuted successfully' });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },
};
