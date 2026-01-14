import { Router } from 'express';
import { coachMessagingController } from '../coach-messaging.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const coachMessagingRouter = Router();

/**
 * @swagger
 * /api/v1/coach/messaging/conversations:
 *   get:
 *     summary: Get all conversations for a coach
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeArchived
 *         schema:
 *           type: boolean
 *         description: Include archived conversations
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of conversations to return
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 */
coachMessagingRouter.get('/conversations', supabaseAuthenticate, coachMessagingController.getConversations);

/**
 * @swagger
 * /api/v1/coach/messaging/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *       - in: query
 *         name: beforeTimestamp
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 */
coachMessagingRouter.get('/conversations/:conversationId/messages', supabaseAuthenticate, coachMessagingController.getMessages);

/**
 * @swagger
 * /api/v1/coach/messaging/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *             properties:
 *               conversationId:
 *                 type: string
 *               content:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, image, video, audio, file]
 *               parentMessageId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
coachMessagingRouter.post('/messages', supabaseAuthenticate, coachMessagingController.sendMessage);

/**
 * @swagger
 * /api/v1/coach/messaging/messages/{messageId}:
 *   delete:
 *     summary: Delete a message (soft delete)
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted successfully
 */
coachMessagingRouter.delete('/messages/:messageId', supabaseAuthenticate, coachMessagingController.deleteMessage);

/**
 * @swagger
 * /api/v1/coach/messaging/reactions:
 *   post:
 *     summary: Add a reaction to a message
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageId
 *               - conversationId
 *               - reaction
 *             properties:
 *               messageId:
 *                 type: string
 *               conversationId:
 *                 type: string
 *               reaction:
 *                 type: string
 *                 enum: ['👍', '❤️', '😂', '😮', '😢', '🙏']
 *     responses:
 *       201:
 *         description: Reaction added successfully
 */
coachMessagingRouter.post('/reactions', supabaseAuthenticate, coachMessagingController.addReaction);

/**
 * @swagger
 * /api/v1/coach/messaging/reactions/{messageId}:
 *   delete:
 *     summary: Remove a reaction from a message
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reaction removed successfully
 */
coachMessagingRouter.delete('/reactions/:messageId', supabaseAuthenticate, coachMessagingController.removeReaction);

/**
 * @swagger
 * /api/v1/coach/messaging/conversations/{conversationId}/read:
 *   post:
 *     summary: Mark conversation as read
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation marked as read
 */
coachMessagingRouter.post('/conversations/:conversationId/read', supabaseAuthenticate, coachMessagingController.markConversationAsRead);

/**
 * @swagger
 * /api/v1/coach/messaging/conversations/{conversationId}/archive:
 *   post:
 *     summary: Archive a conversation
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation archived successfully
 */
coachMessagingRouter.post('/conversations/:conversationId/archive', supabaseAuthenticate, coachMessagingController.archiveConversation);

/**
 * @swagger
 * /api/v1/coach/messaging/conversations/{conversationId}/unarchive:
 *   post:
 *     summary: Unarchive a conversation
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation unarchived successfully
 */
coachMessagingRouter.post('/conversations/:conversationId/unarchive', supabaseAuthenticate, coachMessagingController.unarchiveConversation);

/**
 * @swagger
 * /api/v1/coach/messaging/conversations/{conversationId}/pin:
 *   post:
 *     summary: Pin a conversation
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation pinned successfully
 */
coachMessagingRouter.post('/conversations/:conversationId/pin', supabaseAuthenticate, coachMessagingController.pinConversation);

/**
 * @swagger
 * /api/v1/coach/messaging/conversations/{conversationId}/unpin:
 *   post:
 *     summary: Unpin a conversation
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation unpinned successfully
 */
coachMessagingRouter.post('/conversations/:conversationId/unpin', supabaseAuthenticate, coachMessagingController.unpinConversation);

/**
 * @swagger
 * /api/v1/coach/messaging/conversations/{conversationId}/mute:
 *   post:
 *     summary: Mute a conversation
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation muted successfully
 */
coachMessagingRouter.post('/conversations/:conversationId/mute', supabaseAuthenticate, coachMessagingController.muteConversation);

/**
 * @swagger
 * /api/v1/coach/messaging/conversations/{conversationId}/unmute:
 *   post:
 *     summary: Unmute a conversation
 *     tags: [Coach Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation unmuted successfully
 */
coachMessagingRouter.post('/conversations/:conversationId/unmute', supabaseAuthenticate, coachMessagingController.unmuteConversation);
