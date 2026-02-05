import { Router } from 'express';
import { featureRequestsController } from './feature-requests.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const featureRequestsRouter = Router();

/**
 * @swagger
 * /api/v1/feature-requests:
 *   get:
 *     summary: Get paginated list of feature requests
 *     tags: [Feature Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (0-indexed)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, popular, yours]
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feature requests retrieved successfully
 */
featureRequestsRouter.get('/', supabaseAuthenticate, featureRequestsController.getFeatureRequests);

/**
 * @swagger
 * /api/v1/feature-requests/{id}:
 *   get:
 *     summary: Get a single feature request by ID
 *     tags: [Feature Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Feature request retrieved successfully
 */
featureRequestsRouter.get('/:id', supabaseAuthenticate, featureRequestsController.getFeatureRequestById);

/**
 * @swagger
 * /api/v1/feature-requests:
 *   post:
 *     summary: Create a new feature request
 *     tags: [Feature Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - userName
 *               - userType
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               userName:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [coach, client]
 *               profilePictureUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Feature request created successfully
 */
featureRequestsRouter.post('/', supabaseAuthenticate, featureRequestsController.createFeatureRequest);

/**
 * @swagger
 * /api/v1/feature-requests/{id}:
 *   delete:
 *     summary: Delete a feature request
 *     tags: [Feature Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Feature request deleted successfully
 */
featureRequestsRouter.delete('/:id', supabaseAuthenticate, featureRequestsController.deleteFeatureRequest);

/**
 * @swagger
 * /api/v1/feature-requests/{id}/upvote:
 *   post:
 *     summary: Toggle upvote on a feature request
 *     tags: [Feature Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Upvote toggled successfully
 */
featureRequestsRouter.post('/:id/upvote', supabaseAuthenticate, featureRequestsController.toggleUpvote);

/**
 * @swagger
 * /api/v1/feature-requests/{id}/replies:
 *   get:
 *     summary: Get replies for a feature request
 *     tags: [Feature Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Replies retrieved successfully
 */
featureRequestsRouter.get('/:id/replies', supabaseAuthenticate, featureRequestsController.getReplies);

/**
 * @swagger
 * /api/v1/feature-requests/{id}/replies:
 *   post:
 *     summary: Create a reply to a feature request
 *     tags: [Feature Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - userName
 *               - userType
 *             properties:
 *               message:
 *                 type: string
 *               userName:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [coach, client]
 *               profilePictureUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reply created successfully
 */
featureRequestsRouter.post('/:id/replies', supabaseAuthenticate, featureRequestsController.createReply);

/**
 * @swagger
 * /api/v1/feature-requests/replies/{replyId}:
 *   delete:
 *     summary: Delete a reply
 *     tags: [Feature Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reply deleted successfully
 */
featureRequestsRouter.delete('/replies/:replyId', supabaseAuthenticate, featureRequestsController.deleteReply);
