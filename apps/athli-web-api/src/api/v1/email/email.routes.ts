import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  emailCallbackController,
  emailStatusController,
} from './email.controller';

export const emailRouter = Router();

/**
 * @swagger
 * /api/v1/email/callback:
 *   post:
 *     summary: Store email OAuth tokens
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - access_token
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, outlook, azure]
 *               access_token:
 *                 type: string
 *               provider_access_token:
 *                 type: string
 *               refresh_token:
 *                 type: string
 *               provider_refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens saved successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 */
emailRouter.post('/callback', ...requireAuth, emailCallbackController);

/**
 * @swagger
 * /api/v1/email/status:
 *   get:
 *     summary: Check email connection status
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                 provider:
 *                   type: string
 *                   enum: [google, outlook]
 *       401:
 *         description: Unauthorized
 */
emailRouter.get('/status', ...requireAuth, emailStatusController);

